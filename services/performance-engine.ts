// Compatible with our DbClient wrapper
type SupabaseClient = any;

type PerformanceSnapshot = {
  contractsNeeded: number;
  meetingsNeeded: number;
  leadsNeeded: number;
  dailyMeetingsRequired: number;
  dailyContactsRequired: number;
  projectedRevenue: number;
  revenueCurrent: number;
  conversionRate: number;
};

/**
 * Server-side performance calculation.
 * Dashboard MUST consume this, never calculate in frontend.
 */
export async function calculateAgencyPerformance(
  supabase: SupabaseClient,
  agencyId: string
): Promise<PerformanceSnapshot> {
  // 1. Fetch agency settings
  const { data: agency } = await supabase
    .from("agencies")
    .select("monthly_goal, avg_ticket, conversion_rate")
    .eq("id", agencyId)
    .single();

  const monthlyGoal = Number(agency?.monthly_goal ?? 10000);
  const avgTicket = Number(agency?.avg_ticket ?? 1500);
  const conversionRate = Number(agency?.conversion_rate ?? 0.3);

  // 2. Current month revenue
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: closedDeals } = await supabase
    .from("deals")
    .select("value")
    .eq("agency_id", agencyId)
    .eq("status", "closed_won")
    .gte("created_at", startOfMonth);

  const revenueCurrent = closedDeals?.reduce(
    (sum: number, d: { value: unknown }) => sum + Number(d.value),
    0
  ) ?? 0;

  // 3. Current month meetings
  const { count: meetingsThisMonth } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .gte("created_at", startOfMonth);

  // 4. Calculate what's needed
  const remainingRevenue = Math.max(0, monthlyGoal - revenueCurrent);
  const contractsNeeded =
    avgTicket > 0 ? Math.ceil(remainingRevenue / avgTicket) : 0;
  const meetingsNeeded =
    conversionRate > 0
      ? Math.max(0, Math.ceil(contractsNeeded / conversionRate) - (meetingsThisMonth ?? 0))
      : 0;
  const leadsNeeded =
    conversionRate > 0
      ? Math.ceil(meetingsNeeded / Math.max(conversionRate, 0.1))
      : 0;

  // Days remaining in month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = Math.max(1, endOfMonth.getDate() - now.getDate() + 1);
  const workDays = Math.max(1, Math.ceil(daysRemaining * (5 / 7))); // approximate work days

  const dailyMeetingsRequired = meetingsNeeded > 0 ? Math.round((meetingsNeeded / workDays) * 10) / 10 : 0;
  const dailyContactsRequired = leadsNeeded > 0 ? Math.round((leadsNeeded / workDays) * 10) / 10 : 0;

  // Projected revenue based on current pace
  const daysPassed = now.getDate();
  const totalDaysInMonth = endOfMonth.getDate();
  const projectedRevenue =
    daysPassed > 0
      ? Math.round((revenueCurrent / daysPassed) * totalDaysInMonth)
      : 0;

  const snapshot: PerformanceSnapshot = {
    contractsNeeded,
    meetingsNeeded,
    leadsNeeded,
    dailyMeetingsRequired,
    dailyContactsRequired,
    projectedRevenue,
    revenueCurrent,
    conversionRate: conversionRate * 100,
  };

  // 5. Save daily snapshot (upsert by agency_id + date)
  await supabase.from("performance_snapshots").upsert(
    {
      agency_id: agencyId,
      snapshot_date: now.toISOString().split("T")[0],
      contracts_needed: snapshot.contractsNeeded,
      meetings_needed: snapshot.meetingsNeeded,
      leads_needed: snapshot.leadsNeeded,
      daily_meetings_required: snapshot.dailyMeetingsRequired,
      daily_contacts_required: snapshot.dailyContactsRequired,
      projected_revenue: snapshot.projectedRevenue,
      revenue_current: snapshot.revenueCurrent,
      conversion_rate: snapshot.conversionRate,
    },
    { onConflict: "agency_id,snapshot_date" }
  );

  return snapshot;
}

/**
 * Generate strategic alerts for an agency.
 */
export async function generateAlerts(
  supabase: SupabaseClient,
  agencyId: string
): Promise<void> {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Leads without contact for 3+ days
  const { count: staleLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "new")
    .is("deleted_at", null)
    .lte("created_at", threeDaysAgo);

  if ((staleLeads ?? 0) > 0) {
    await upsertAlert(supabase, agencyId, "stale_leads", "Leads sem contato",
      `Voce tem ${staleLeads} leads ha mais de 3 dias sem contato. O tempo de resposta impacta diretamente a conversao.`, "warning");
  }

  // 2. Goal at risk
  const performance = await calculateAgencyPerformance(supabase, agencyId);
  const { data: agency } = await supabase
    .from("agencies")
    .select("monthly_goal")
    .eq("id", agencyId)
    .single();
  const monthlyGoal = Number(agency?.monthly_goal ?? 10000);

  if (performance.projectedRevenue < monthlyGoal * 0.7 && performance.revenueCurrent < monthlyGoal) {
    await upsertAlert(supabase, agencyId, "goal_at_risk", "Meta em risco",
      `Receita projetada: R$ ${performance.projectedRevenue.toLocaleString("pt-BR")}. Meta: R$ ${monthlyGoal.toLocaleString("pt-BR")}. Aumente o ritmo de reunioes.`, "critical");
  }

  // 3. Conversion below average
  const { data: allLeads } = await supabase
    .from("leads")
    .select("status")
    .eq("agency_id", agencyId)
    .is("deleted_at", null);

  if (allLeads && allLeads.length >= 10) {
    const won = allLeads.filter((l: { status: string }) => l.status === "closed_won").length;
    const total = allLeads.length;
    const actualConv = (won / total) * 100;
    if (actualConv < 5) {
      await upsertAlert(supabase, agencyId, "low_conversion", "Conversao abaixo da media",
        `Sua taxa de conversao atual e de ${actualConv.toFixed(1)}%. A media do setor e 10-15%. Revise seu funil de vendas.`, "warning");
    }
  }

  // 4. AI usage above 80%
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("ai_credits_used, ai_credits_limit, searches_used, searches_limit")
    .eq("agency_id", agencyId)
    .single();

  if (subscription) {
    const aiUsagePercent = (Number(subscription.ai_credits_used ?? 0) / Math.max(Number(subscription.ai_credits_limit ?? 1), 1)) * 100;
    const searchUsagePercent = (Number(subscription.searches_used ?? 0) / Math.max(Number(subscription.searches_limit ?? 1), 1)) * 100;

    if (aiUsagePercent >= 80 || searchUsagePercent >= 80) {
      await upsertAlert(supabase, agencyId, "high_usage", "Uso de IA acima de 80%",
        `IA: ${Math.round(aiUsagePercent)}% | Buscas: ${Math.round(searchUsagePercent)}%. Considere fazer upgrade do plano para evitar interrupcao.`, "warning");
    }
  }
}

async function upsertAlert(
  supabase: SupabaseClient,
  agencyId: string,
  type: string,
  title: string,
  message: string,
  severity: string
): Promise<void> {
  // Only create if no recent unread alert of same type (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("agency_alerts")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("type", type)
    .eq("is_read", false)
    .gte("created_at", oneDayAgo)
    .limit(1);

  if (!existing || existing.length === 0) {
    await supabase.from("agency_alerts").insert({
      agency_id: agencyId,
      type,
      title,
      message,
      severity,
    });
  }
}

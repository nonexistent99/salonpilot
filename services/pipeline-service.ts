type SupabaseClient = any;

export const VALID_STATUSES = [
  "new",
  "contacted",
  "meeting_scheduled",
  "proposal_sent",
  "closed_won",
  "closed_lost",
] as const;

export type LeadStatus = (typeof VALID_STATUSES)[number];

/**
 * Move a lead through the pipeline with automatic triggers.
 * All side effects (deals, metrics, recalculation) happen here.
 */
export async function moveLeadPipeline(
  supabase: SupabaseClient,
  agencyId: string,
  leadId: string,
  newStatus: LeadStatus,
  dealValue?: number
): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch current lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    return { success: false, error: "Lead nao encontrado" };
  }

  // 2. Update lead status
  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: newStatus })
    .eq("id", leadId);

  if (updateError) {
    return { success: false, error: "Erro ao atualizar status: " + updateError.message };
  }

  // 3. Trigger: closed_won -> create deal + update metrics
  if (newStatus === "closed_won") {
    const value = dealValue || Number(lead.opportunity_score ?? 0) * 50;

    // Create deal
    await supabase.from("deals").insert({
      agency_id: agencyId,
      lead_id: leadId,
      value,
      status: "closed_won",
      closed_at: new Date().toISOString(),
    });

    // Update monthly_performance
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: existingPerf } = await supabase
      .from("monthly_performance")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("month", monthKey)
      .single();

    if (existingPerf) {
      await supabase
        .from("monthly_performance")
        .update({
          revenue: Number(existingPerf.revenue ?? 0) + value,
          deals_closed: Number(existingPerf.deals_closed ?? 0) + 1,
        })
        .eq("id", existingPerf.id);
    } else {
      await supabase.from("monthly_performance").insert({
        agency_id: agencyId,
        month: monthKey,
        revenue: value,
        deals_closed: 1,
        leads_generated: 0,
        meetings_held: 0,
      });
    }
  }

  // 4. Trigger: closed_lost -> log for conversion metrics
  if (newStatus === "closed_lost") {
    await supabase.from("deals").insert({
      agency_id: agencyId,
      lead_id: leadId,
      value: 0,
      status: "closed_lost",
      closed_at: new Date().toISOString(),
    });
  }

  return { success: true };
}

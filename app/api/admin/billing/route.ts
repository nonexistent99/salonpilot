import { requireAdmin } from "@/lib/admin-guard";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("agency_id, plan, status, stripe_customer_id, searches_used, searches_limit, ai_credits_used, ai_credits_limit, music_used, music_limit, current_period_end, created_at")
    .order("created_at", { ascending: false });

  const allSubs = subs || [];
  const active = allSubs.filter((s) => s.status === "active");
  const inactive = allSubs.filter((s) => s.status !== "active");

  const planPrices: Record<string, number> = { free: 0, starter: 97, pro: 197, enterprise: 497 };

  // Revenue per plan
  const revenuePerPlan: Record<string, { count: number; revenue: number }> = {};
  for (const s of active) {
    if (!revenuePerPlan[s.plan]) revenuePerPlan[s.plan] = { count: 0, revenue: 0 };
    revenuePerPlan[s.plan].count++;
    revenuePerPlan[s.plan].revenue += planPrices[s.plan] || 0;
  }

  // Get agency names
  const agencyIds = allSubs.map((s) => s.agency_id).filter(Boolean);
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name")
    .in("id", agencyIds.length > 0 ? agencyIds : ["__none__"]);

  const agencyMap = new Map((agencies || []).map((a) => [a.id, a.name]));

  const subscriptions = allSubs.map((s) => ({
    ...s,
    agency_name: agencyMap.get(s.agency_id) || "N/A",
    monthly_value: planPrices[s.plan] || 0,
  }));

  return NextResponse.json({
    totalActive: active.length,
    totalInactive: inactive.length,
    mrr: active.reduce((sum, s) => sum + (planPrices[s.plan] || 0), 0),
    revenuePerPlan,
    subscriptions,
  });
}

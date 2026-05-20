import { requireAdmin } from "@/lib/admin-guard";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // All queries in parallel
  const [
    { count: totalUsers },
    { count: newToday },
    { data: subscriptions },
    { data: deals },
    { data: profiles },
    { data: recentSubs },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("subscriptions").select("plan, status, current_period_end"),
    supabase.from("deals").select("value, created_at").gte("created_at", startOfMonth),
    supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
    supabase.from("subscriptions").select("plan, created_at, status").order("created_at", { ascending: true }),
  ]);

  // Active users = users with active subscription
  const activeSubscriptions = (subscriptions || []).filter((s) => s.status === "active");
  const activeUsers = activeSubscriptions.length;

  // MRR calculation
  const planPrices: Record<string, number> = { free: 0, starter: 97, pro: 197, enterprise: 497 };
  const mrr = activeSubscriptions.reduce((sum, s) => sum + (planPrices[s.plan] || 0), 0);
  const arr = mrr * 12;

  // Revenue by plan
  const revenueByPlan: Record<string, { count: number; revenue: number }> = {};
  for (const s of activeSubscriptions) {
    if (!revenueByPlan[s.plan]) revenueByPlan[s.plan] = { count: 0, revenue: 0 };
    revenueByPlan[s.plan].count++;
    revenueByPlan[s.plan].revenue += planPrices[s.plan] || 0;
  }

  // Total deal revenue this month
  const totalRevenue = (deals || []).reduce((sum, d) => sum + (d.value || 0), 0);

  // User growth - group by month (last 6 months)
  const userGrowth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const count = (profiles || []).filter(
      (p) => new Date(p.created_at) <= endOfMonth
    ).length;
    userGrowth.push({ month: label, count });
  }

  // Subscription growth by month
  const subGrowth: { month: string; free: number; starter: number; pro: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const relevantSubs = (recentSubs || []).filter(
      (s) => new Date(s.created_at) <= endOfMonth
    );
    subGrowth.push({
      month: label,
      free: relevantSubs.filter((s) => s.plan === "free").length,
      starter: relevantSubs.filter((s) => s.plan === "starter").length,
      pro: relevantSubs.filter((s) => s.plan === "pro").length,
    });
  }

  // Revenue chart (last 6 months from deals)
  const revenueChart: { month: string; revenue: number }[] = [];
  const allDeals = (await supabase.from("deals").select("value, created_at")).data || [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthRevenue = allDeals
      .filter((deal) => {
        const cd = new Date(deal.created_at);
        return cd >= d && cd <= endOfMonth;
      })
      .reduce((sum, deal) => sum + (deal.value || 0), 0);
    revenueChart.push({ month: label, revenue: monthRevenue });
  }

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    activeUsers,
    newToday: newToday || 0,
    mrr,
    arr,
    totalRevenue,
    revenueByPlan,
    userGrowth,
    subGrowth,
    revenueChart,
  });
}

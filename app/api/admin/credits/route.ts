import { requireAdmin } from "@/lib/admin-guard";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Credits used today
  const { data: todayTx } = await supabase
    .from("credit_transactions")
    .select("amount, agency_id, description, created_at")
    .lt("amount", 0)
    .gte("created_at", startOfDay)
    .order("created_at", { ascending: false });

  const creditsToday = (todayTx || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Credits used this month
  const { data: monthTx } = await supabase
    .from("credit_transactions")
    .select("amount, agency_id, description, type, created_at")
    .lt("amount", 0)
    .gte("created_at", startOfMonth)
    .order("created_at", { ascending: false });

  const creditsMonth = (monthTx || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Top users by consumption
  const usageByAgency: Record<string, number> = {};
  for (const tx of monthTx || []) {
    if (!tx.agency_id) continue;
    usageByAgency[tx.agency_id] = (usageByAgency[tx.agency_id] || 0) + Math.abs(tx.amount);
  }

  const topAgencyIds = Object.entries(usageByAgency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Resolve agency names
  const ids = topAgencyIds.map(([id]) => id);
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name")
    .in("id", ids.length > 0 ? ids : ["__none__"]);

  const agencyMap = new Map((agencies || []).map((a) => [a.id, a.name]));

  const topUsers = topAgencyIds.map(([id, credits]) => ({
    agency_id: id,
    agency_name: agencyMap.get(id) || "N/A",
    credits_used: credits,
  }));

  // Recent transactions
  const { data: recent } = await supabase
    .from("credit_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Daily credit usage chart (last 14 days)
  const dailyUsage: { date: string; credits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayCredits = (monthTx || [])
      .filter((t) => {
        const cd = new Date(t.created_at);
        return cd >= dayStart && cd < dayEnd;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    dailyUsage.push({ date: label, credits: dayCredits });
  }

  return NextResponse.json({
    creditsToday,
    creditsMonth,
    topUsers,
    recent: recent || [],
    dailyUsage,
  });
}

import { requireAdmin } from "@/lib/admin-guard";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const supabase = guard.supabase!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: logs } = await supabase
    .from("ai_usage_log")
    .select("*")
    .gte("created_at", startOfMonth)
    .order("created_at", { ascending: false });

  const allLogs = logs || [];

  // Total tokens + credits this month
  const totalTokens = allLogs.reduce((s, l) => s + (l.tokens_used || 0), 0);
  const totalCredits = allLogs.reduce((s, l) => s + (l.credits_consumed || 0), 0);

  // AI usage per day (last 14 days)
  const dailyUsage: { date: string; tokens: number; credits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayLogs = allLogs.filter((l) => {
      const cd = new Date(l.created_at);
      return cd >= dayStart && cd < dayEnd;
    });
    dailyUsage.push({
      date: label,
      tokens: dayLogs.reduce((s, l) => s + (l.tokens_used || 0), 0),
      credits: dayLogs.reduce((s, l) => s + (l.credits_consumed || 0), 0),
    });
  }

  // Usage per feature
  const byFeature: Record<string, { count: number; tokens: number; credits: number }> = {};
  for (const log of allLogs) {
    const feat = log.action || "unknown";
    if (!byFeature[feat]) byFeature[feat] = { count: 0, tokens: 0, credits: 0 };
    byFeature[feat].count++;
    byFeature[feat].tokens += log.tokens_used || 0;
    byFeature[feat].credits += log.credits_consumed || 0;
  }

  const featureBreakdown = Object.entries(byFeature).map(([feature, data]) => ({
    feature,
    ...data,
  }));

  // Recent logs
  const recent = allLogs.slice(0, 50);

  return NextResponse.json({
    totalTokens,
    totalCredits,
    totalCalls: allLogs.length,
    dailyUsage,
    featureBreakdown,
    recent,
  });
}

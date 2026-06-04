import { requireAdmin } from '@/lib/admin-guard';
import { sql, sqlOne } from '@/lib/db/neon';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const [
    totalUsers,
    activeUsers,
    totalSalons,
    conversationsMonth,
    aiRunsMonth,
    appointmentsByAi,
    aiCost,
    recentErrors,
    planRows,
  ] = await Promise.all([
    sqlOne<{ count: string }>(`SELECT COUNT(*) as count FROM users`, []),
    sqlOne<{ count: string }>(`SELECT COUNT(*) as count FROM users WHERE active = TRUE`, []),
    sqlOne<{ count: string }>(`SELECT COUNT(*) as count FROM salons`, []),
    sqlOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM conversation_threads
       WHERE created_at >= date_trunc('month', NOW())`,
      []
    ),
    sqlOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM ai_runs
       WHERE created_at >= date_trunc('month', NOW())`,
      []
    ),
    sqlOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM appointments
       WHERE source = 'ai_whatsapp' AND created_at >= date_trunc('month', NOW())`,
      []
    ),
    sqlOne<{ total: string }>(
      `SELECT COALESCE(SUM(estimated_cost_usd), 0) as total
       FROM ai_runs
       WHERE created_at >= date_trunc('month', NOW())`,
      []
    ),
    sql(
      `SELECT id, run_type, model, error, created_at
       FROM ai_runs
       WHERE status = 'failed'
       ORDER BY created_at DESC
       LIMIT 8`,
      []
    ),
    sql<{ plan: string; count: string }>(
      `SELECT COALESCE(plan, 'free') as plan, COUNT(*) as count
       FROM salons
       GROUP BY COALESCE(plan, 'free')`,
      []
    ),
  ]);

  const planPrices: Record<string, number> = { free: 0, starter: 97, pro: 197, elite: 497 };
  const revenueByPlan = Object.fromEntries(
    planRows.map((row) => {
      const count = Number(row.count || 0);
      return [row.plan, { count, revenue: count * (planPrices[row.plan] || 0) }];
    })
  );
  const mrr = Object.values(revenueByPlan).reduce((sum: number, row: any) => sum + row.revenue, 0);

  const now = new Date();
  const userGrowth = [];
  const revenueChart = [];
  const subGrowth = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    userGrowth.push({ month: label, count: Number(totalUsers?.count || 0) });
    revenueChart.push({ month: label, revenue: mrr });
    subGrowth.push({
      month: label,
      free: Number(planRows.find((p) => p.plan === 'free')?.count || 0),
      starter: Number(planRows.find((p) => p.plan === 'starter')?.count || 0),
      pro: Number(planRows.find((p) => p.plan === 'pro')?.count || 0),
    });
  }

  return NextResponse.json({
    totalUsers: Number(totalUsers?.count || 0),
    activeUsers: Number(activeUsers?.count || 0),
    newToday: 0,
    totalSalons: Number(totalSalons?.count || 0),
    mrr,
    arr: mrr * 12,
    totalRevenue: mrr,
    conversationsMonth: Number(conversationsMonth?.count || 0),
    aiRepliesMonth: Number(aiRunsMonth?.count || 0),
    appointmentsCreatedByAi: Number(appointmentsByAi?.count || 0),
    aiCostUsd: Number(aiCost?.total || 0),
    costPerAppointment: Number(appointmentsByAi?.count || 0) > 0
      ? Number(aiCost?.total || 0) / Number(appointmentsByAi?.count || 1)
      : 0,
    recentErrors,
    revenueByPlan,
    userGrowth,
    subGrowth,
    revenueChart,
  });
}

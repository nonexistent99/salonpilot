import { requireAdmin } from '@/lib/admin-guard';
import { sql, sqlOne } from '@/lib/db/neon';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const [totals, distribution, subscriptions, collected] = await Promise.all([
    sqlOne<{ active: string; inactive: string; mrr: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
              COUNT(*) FILTER (WHERE status <> 'ACTIVE')::text AS inactive,
              COALESCE(SUM(amount) FILTER (WHERE status = 'ACTIVE'), 0)::text AS mrr
       FROM billing_subscriptions`),
    sql<{ plan: string; count: string; revenue: string }>(
      `SELECT plan, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS revenue
       FROM billing_subscriptions WHERE status = 'ACTIVE' GROUP BY plan ORDER BY plan`),
    sql<{ id: string; salon_name: string; plan: string; status: string; amount: string; next_payment_date: string | null; created_at: string }>(
      `SELECT b.id, s.name AS salon_name, b.plan, b.status, b.amount,
              b.next_payment_date, b.created_at
       FROM billing_subscriptions b JOIN salons s ON s.id = b.salon_id
       ORDER BY b.created_at DESC LIMIT 100`),
    sqlOne<{ amount: string; payments: string }>(`SELECT COALESCE(SUM(amount), 0)::text AS amount, COUNT(*)::text AS payments
       FROM billing_payments WHERE payment_date >= date_trunc('month', NOW())`),
  ]);
  return NextResponse.json({
    totalActive: Number(totals?.active || 0), totalInactive: Number(totals?.inactive || 0),
    mrr: Number(totals?.mrr || 0), collectedMonth: Number(collected?.amount || 0), paymentCount: Number(collected?.payments || 0),
    revenuePerPlan: Object.fromEntries(distribution.map(r => [r.plan, { count: Number(r.count), revenue: Number(r.revenue) }])),
    subscriptions: subscriptions.map(r => ({ ...r, agency_id: r.id, agency_name: r.salon_name, monthly_value: Number(r.amount), current_period_end: r.next_payment_date })),
  });
}

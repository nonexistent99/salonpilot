import { requireAdmin } from '@/lib/admin-guard';
import { sql, sqlOne } from '@/lib/db/neon';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const [totals, dailyUsage, featureBreakdown, recent] = await Promise.all([
    sqlOne<{ input: string; output: string; cost: string; calls: string }>(
      `SELECT COALESCE(SUM(input_tokens), 0) as input,
              COALESCE(SUM(output_tokens), 0) as output,
              COALESCE(SUM(estimated_cost_usd), 0) as cost,
              COUNT(*) as calls
       FROM ai_runs
       WHERE created_at >= date_trunc('month', NOW())`
    ),
    sql(
      `SELECT date::text, total_input_tokens + total_output_tokens as tokens, total_cost_usd as cost
       FROM ai_usage_daily
       WHERE date >= CURRENT_DATE - INTERVAL '14 days'
       ORDER BY date`
    ),
    sql(
      `SELECT run_type as feature, COUNT(*) as count,
              COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
              COALESCE(SUM(estimated_cost_usd), 0) as cost
       FROM ai_runs
       WHERE created_at >= date_trunc('month', NOW())
       GROUP BY run_type
       ORDER BY count DESC`
    ),
    sql(
      `SELECT ar.id, ar.salon_id, s.name as salon_name, ar.run_type, ar.model,
              ar.input_tokens, ar.output_tokens, ar.estimated_cost_usd, ar.status, ar.error, ar.created_at
       FROM ai_runs ar
       LEFT JOIN salons s ON s.id = ar.salon_id
       ORDER BY ar.created_at DESC
       LIMIT 50`
    ),
  ]);

  return NextResponse.json({
    totalTokens: Number(totals?.input || 0) + Number(totals?.output || 0),
    totalCredits: Number(totals?.cost || 0),
    totalCalls: Number(totals?.calls || 0),
    dailyUsage,
    featureBreakdown,
    recent,
  });
}

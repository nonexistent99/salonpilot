import { requireAdmin } from '@/lib/admin-guard';
import { sql } from '@/lib/db/neon';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const plans = await sql(
    `SELECT COALESCE(plan, 'free') as plan, COUNT(*) as count
     FROM salons
     GROUP BY COALESCE(plan, 'free')
     ORDER BY plan`
  );

  return NextResponse.json({ plans, subscriptions: [] });
}

import { requireAdmin } from '@/lib/admin-guard';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  return NextResponse.json({
    packages: [],
    transactions: [],
    note: 'Creditos legados foram substituidos por logs/custos em ai_runs e ai_usage_daily.',
  });
}

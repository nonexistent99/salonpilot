import { requireAdmin } from '@/lib/admin-guard';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  return NextResponse.json({
    logs: [],
    note: 'Busca legada sem logs ativos neste escopo.',
  });
}

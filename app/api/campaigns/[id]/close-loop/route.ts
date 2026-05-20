/**
 * POST /api/campaigns/[id]/close-loop
 *
 * Fecha o experimento vinculado à campanha (Learning Layer).
 * Útil quando:
 *   - a dona quer encerrar a campanha manualmente
 *   - cron rodou e considera a campanha estabilizada (7+ dias sem novos bookings)
 */

import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { closeExperimentForCampaign } from '@/services/learning';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const resolved = await Promise.resolve(params);
    const id = resolved.id;
    if (!id) return NextResponse.json({ error: 'campaign id requerido.' }, { status: 400 });

    const result = await closeExperimentForCampaign(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[campaigns/close-loop]', err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro interno.',
    }, { status: 500 });
  }
}

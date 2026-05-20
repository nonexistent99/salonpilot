import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne } from '@/lib/db/neon';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const mission = await sqlOne(
      `UPDATE daily_missions
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND salon_id = $2
       RETURNING *`,
      [params.id, auth.salonId]
    );

    if (!mission) {
      return NextResponse.json({ error: 'Missão não encontrada.' }, { status: 404 });
    }

    return NextResponse.json(mission);
  } catch (err) {
    console.error('[API /missions/[id]/complete]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

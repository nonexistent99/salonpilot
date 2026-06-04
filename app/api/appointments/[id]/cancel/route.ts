import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne } from '@/lib/db/neon';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const appointment = await sqlOne(
    `UPDATE appointments
     SET status = 'canceled',
         notes = COALESCE($3, notes),
         updated_at = NOW()
     WHERE salon_id = $1 AND id = $2
     RETURNING *`,
    [auth.salonId, id, body.reason || null]
  );

  if (!appointment) return NextResponse.json({ error: 'Agendamento nao encontrado.' }, { status: 404 });
  return NextResponse.json({ appointment });
}

import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne } from '@/lib/db/neon';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const appointment = await sqlOne(
    `UPDATE appointments
     SET status = COALESCE($3, status),
         notes = COALESCE($4, notes),
         updated_at = NOW()
     WHERE salon_id = $1 AND id = $2
     RETURNING *`,
    [auth.salonId, id, body.status || null, body.notes || null]
  );

  if (!appointment) return NextResponse.json({ error: 'Agendamento nao encontrado.' }, { status: 404 });
  return NextResponse.json({ appointment });
}

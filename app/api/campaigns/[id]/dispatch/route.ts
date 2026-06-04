import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const campaign = await sqlOne<{ id: string; status: string }>(
    `SELECT id, status FROM campaigns WHERE salon_id = $1 AND id = $2`,
    [auth.salonId, id]
  );

  if (!campaign) return NextResponse.json({ error: 'Campanha nao encontrada.' }, { status: 404 });

  await sql(
    `UPDATE campaigns
     SET status = 'approved',
         approved_by_user_id = $3,
         updated_at = NOW()
     WHERE salon_id = $1 AND id = $2`,
    [auth.salonId, id, auth.user.id]
  );

  return NextResponse.json({
    success: true,
    status: 'approved',
    message: 'Campanha aprovada. O envio em massa automatico fica bloqueado no MVP; use a inbox/WhatsApp com aprovacao humana.',
  });
}

import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql } from '@/lib/db/neon';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const messages = await sql(
    `SELECT id, direction, sender_type, message_type, content, media_url, provider_message_id, created_at
     FROM messages
     WHERE salon_id = $1 AND thread_id = $2
     ORDER BY created_at ASC
     LIMIT 200`,
    [auth.salonId, id]
  );

  return NextResponse.json({ messages });
}

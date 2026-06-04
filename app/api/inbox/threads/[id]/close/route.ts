import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql } from '@/lib/db/neon';
import { finalizeConversation } from '@/services/ai/conversation-finalizer';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  await sql(
    `UPDATE conversation_threads
     SET status = 'completed', closed_at = NOW(), updated_at = NOW()
     WHERE salon_id = $1 AND id = $2`,
    [auth.salonId, id]
  );

  const summary = await finalizeConversation({ salonId: auth.salonId, threadId: id, outcome: 'manual_close' });
  return NextResponse.json({ success: true, summary });
}

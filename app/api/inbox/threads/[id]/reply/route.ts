import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne } from '@/lib/db/neon';
import { sendWhatsAppText } from '@/services/messaging/outbound-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const text = String(body.text || '').trim();
  if (!text) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });

  const thread = await sqlOne<{
    id: string;
    customer_id: string;
    whatsapp_account_id: string;
    phone: string;
  }>(
    `SELECT id, customer_id, whatsapp_account_id, phone
     FROM conversation_threads
     WHERE salon_id = $1 AND id = $2`,
    [auth.salonId, id]
  );

  if (!thread) return NextResponse.json({ error: 'Thread nao encontrada.' }, { status: 404 });

  const result = await sendWhatsAppText({
    salonId: auth.salonId,
    accountId: thread.whatsapp_account_id,
    threadId: thread.id,
    customerId: thread.customer_id,
    toPhone: thread.phone,
    text,
    senderType: 'human',
  });

  return NextResponse.json(result);
}

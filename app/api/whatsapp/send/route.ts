import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sendWhatsAppText } from '@/services/messaging/outbound-service';

export async function POST(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const body = await request.json();
  if (!body.account_id || !body.to || !body.text) {
    return NextResponse.json({ error: 'account_id, to e text sao obrigatorios.' }, { status: 400 });
  }

  const result = await sendWhatsAppText({
    salonId: auth.salonId,
    accountId: body.account_id,
    threadId: body.thread_id || null,
    customerId: body.customer_id || null,
    toPhone: body.to,
    text: body.text,
    senderType: body.sender_type === 'human' ? 'human' : 'system',
  });

  return NextResponse.json(result);
}

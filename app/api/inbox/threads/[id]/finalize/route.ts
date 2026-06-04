import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { finalizeConversation } from '@/services/ai/conversation-finalizer';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const summary = await finalizeConversation({ salonId: auth.salonId, threadId: id });
  return NextResponse.json({ success: true, summary });
}

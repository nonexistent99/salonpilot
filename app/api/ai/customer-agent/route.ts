import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { runCustomerAgent } from '@/services/ai/ai-agent-runner';
import { processDueMessageBatches } from '@/services/messaging/batch-processor';

export async function POST(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  if (body.thread_id) {
    const result = await runCustomerAgent({
      salonId: auth.salonId,
      threadId: body.thread_id,
      userId: auth.user.id,
      batchText: body.message || null,
      sendOutbound: body.send_outbound !== false,
    });
    return NextResponse.json(result);
  }

  const result = await processDueMessageBatches({ salonId: auth.salonId, limit: body.limit });
  return NextResponse.json(result);
}

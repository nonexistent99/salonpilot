import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql } from '@/lib/db/neon';
import { runCustomerAgent } from '@/services/ai/ai-agent-runner';

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

  const batches = await sql<{ id: string; thread_id: string }>(
    `UPDATE message_batches
     SET status = 'processing', updated_at = NOW()
     WHERE id IN (
       SELECT id
       FROM message_batches
       WHERE salon_id = $1 AND status = 'scheduled' AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT 10
     )
     RETURNING id, thread_id`,
    [auth.salonId]
  );

  const results = [];
  for (const batch of batches) {
    try {
      const result = await runCustomerAgent({ salonId: auth.salonId, threadId: batch.thread_id });
      await sql(
        `UPDATE message_batches SET status = 'processed', processed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [batch.id]
      );
      results.push({ batch_id: batch.id, result });
    } catch (error) {
      await sql(
        `UPDATE message_batches SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [batch.id]
      );
      results.push({ batch_id: batch.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

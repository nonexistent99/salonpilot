import { sql } from "@/lib/db/neon";
import { runCustomerAgent } from "@/services/ai/ai-agent-runner";

type ClaimedBatch = {
  id: string;
  salon_id: string;
  thread_id: string;
};

export async function claimDueMessageBatches(args: {
  salonId?: string | null;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
  const params: unknown[] = [limit];
  let salonFilter = "";

  if (args.salonId) {
    params.push(args.salonId);
    salonFilter = `AND salon_id = $${params.length}`;
  }

  return sql<ClaimedBatch>(
    `WITH due AS (
       SELECT id
       FROM message_batches
       WHERE status = 'scheduled'
         AND scheduled_for <= NOW()
         ${salonFilter}
         AND NOT EXISTS (SELECT 1 FROM message_batches running WHERE running.thread_id=message_batches.thread_id AND running.status='processing')
       ORDER BY scheduled_for ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE message_batches mb
     SET status = 'processing', updated_at = NOW()
     FROM due
     WHERE mb.id = due.id
     RETURNING mb.id, mb.salon_id, mb.thread_id`,
    params,
  );
}

export async function processDueMessageBatches(args: {
  salonId?: string | null;
  limit?: number;
  sendOutbound?: boolean;
}) {
  await sql(
    `WITH stalled AS (
    UPDATE message_batches SET status='failed',updated_at=NOW()
    WHERE status='processing' AND updated_at<NOW()-INTERVAL '15 minutes'
    AND ($1::uuid IS NULL OR salon_id=$1) RETURNING salon_id,thread_id
  ) UPDATE conversation_threads t SET status='human_handoff',ai_enabled=FALSE,updated_at=NOW()
    FROM stalled s WHERE t.salon_id=s.salon_id AND t.id=s.thread_id`,
    [args.salonId || null],
  );
  const batches = await claimDueMessageBatches({
    salonId: args.salonId,
    limit: args.limit,
  });
  const results = [];

  for (const batch of batches) {
    try {
      const result = await runCustomerAgent({
        salonId: batch.salon_id,
        threadId: batch.thread_id,
        sendOutbound: args.sendOutbound,
      });
      await sql(
        `UPDATE message_batches
         SET status = 'processed', processed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [batch.id],
      );
      results.push({ batch_id: batch.id, thread_id: batch.thread_id, result });
    } catch (error) {
      await sql(
        "UPDATE conversation_threads SET status='human_handoff',ai_enabled=FALSE,updated_at=NOW() WHERE salon_id=$1 AND id=$2",
        [batch.salon_id, batch.thread_id],
      );
      await sql(
        `UPDATE message_batches
         SET status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [batch.id],
      );
      results.push({
        batch_id: batch.id,
        thread_id: batch.thread_id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { processed: results.length, results };
}

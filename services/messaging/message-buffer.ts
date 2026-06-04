import { sql, sqlOne } from '@/lib/db/neon';

export async function enqueueMessageBatch(args: {
  salonId: string;
  threadId: string;
  delaySeconds?: number;
}) {
  const delaySeconds = args.delaySeconds ?? 6;
  const scheduledFor = new Date(Date.now() + delaySeconds * 1000).toISOString();

  const existing = await sqlOne<{ id: string }>(
    `SELECT id
     FROM message_batches
     WHERE salon_id = $1 AND thread_id = $2 AND status = 'scheduled'
     ORDER BY created_at DESC
     LIMIT 1`,
    [args.salonId, args.threadId]
  );

  if (existing) {
    await sql(
      `UPDATE message_batches
       SET scheduled_for = $3, updated_at = NOW()
       WHERE salon_id = $1 AND id = $2`,
      [args.salonId, existing.id, scheduledFor]
    );
    return existing;
  }

  return sqlOne(
    `INSERT INTO message_batches (salon_id, thread_id, scheduled_for)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [args.salonId, args.threadId, scheduledFor]
  );
}

export async function getUnprocessedInboundMessages(threadId: string) {
  return sql(
    `SELECT id, content, message_type, created_at
     FROM messages
     WHERE thread_id = $1
       AND direction = 'inbound'
       AND ai_processed = FALSE
     ORDER BY created_at ASC`,
    [threadId]
  );
}

export async function markMessagesProcessed(messageIds: string[]) {
  if (messageIds.length === 0) return;
  await sql(
    `UPDATE messages
     SET ai_processed = TRUE
     WHERE id = ANY($1::uuid[])`,
    [messageIds]
  );
}

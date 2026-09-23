import { sql, sqlOne } from "@/lib/db/neon";

export async function enqueueMessageBatch(args: {
  salonId: string;
  threadId: string;
  delaySeconds?: number;
}) {
  const delaySeconds = args.delaySeconds ?? 6;
  const scheduledFor = new Date(Date.now() + delaySeconds * 1000).toISOString();

  return sqlOne(
    `INSERT INTO message_batches(salon_id,thread_id,scheduled_for)
    VALUES($1,$2,$3) ON CONFLICT(salon_id,thread_id) WHERE status='scheduled'
    DO UPDATE SET scheduled_for=EXCLUDED.scheduled_for,updated_at=NOW() RETURNING id`,
    [args.salonId, args.threadId, scheduledFor],
  );
}

export async function getUnprocessedInboundMessages(
  salonId: string,
  threadId: string,
) {
  return sql(
    `SELECT id, content, message_type, created_at
     FROM messages
     WHERE thread_id = $1 AND salon_id = $2
       AND direction = 'inbound'
       AND ai_processed = FALSE
     ORDER BY created_at ASC`,
    [threadId, salonId],
  );
}

export async function markMessagesProcessed(
  salonId: string,
  messageIds: string[],
) {
  if (messageIds.length === 0) return;
  await sql(
    `UPDATE messages
     SET ai_processed = TRUE
     WHERE id = ANY($1::uuid[]) AND salon_id=$2`,
    [messageIds, salonId],
  );
}

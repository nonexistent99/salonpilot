import { sql } from '@/lib/db/neon';

export async function createFollowUpTask(args: {
  salonId: string;
  customerId: string;
  threadId?: string | null;
  dueAt: string;
  reason: string;
  messageSuggestion?: string | null;
}) {
  const [task] = await sql(
    `INSERT INTO follow_up_tasks (salon_id, customer_id, thread_id, due_at, reason, message_suggestion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      args.salonId,
      args.customerId,
      args.threadId || null,
      args.dueAt,
      args.reason,
      args.messageSuggestion || null,
    ]
  );

  await sql(
    `INSERT INTO lead_events (salon_id, customer_id, thread_id, event_type, metadata)
     VALUES ($1, $2, $3, 'follow_up.created', $4::jsonb)`,
    [
      args.salonId,
      args.customerId,
      args.threadId || null,
      JSON.stringify({ due_at: args.dueAt, reason: args.reason }),
    ]
  );

  return { success: true, task };
}

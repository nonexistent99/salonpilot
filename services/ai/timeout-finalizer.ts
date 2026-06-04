import { sql } from '@/lib/db/neon';
import { finalizeConversation } from './conversation-finalizer';

type TimedOutThread = {
  id: string;
  salon_id: string;
  status: string;
};

export async function finalizeTimedOutThreads(args: { limit?: number }) {
  const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
  const threads = await sql<TimedOutThread>(
    `SELECT id, salon_id, status
     FROM conversation_threads
     WHERE status IN ('active', 'waiting_client')
       AND customer_id IS NOT NULL
       AND COALESCE(last_message_at, updated_at, created_at) < NOW() - INTERVAL '24 hours'
     ORDER BY COALESCE(last_message_at, updated_at, created_at) ASC
     LIMIT $1`,
    [limit]
  );

  const results = [];
  for (const thread of threads) {
    const outcome = thread.status === 'waiting_client' ? 'timeout_24h' : 'abandoned';
    try {
      const summary = await finalizeConversation({
        salonId: thread.salon_id,
        threadId: thread.id,
        outcome,
      });
      results.push({ thread_id: thread.id, salon_id: thread.salon_id, outcome, summary });
    } catch (error) {
      results.push({
        thread_id: thread.id,
        salon_id: thread.salon_id,
        outcome,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { finalized: results.length, results };
}

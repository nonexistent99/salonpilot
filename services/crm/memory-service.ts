import { sql } from '@/lib/db/neon';

export async function saveClientMemory(args: {
  salonId: string;
  customerId: string;
  type: string;
  content: string;
  confidence?: number;
  sourceThreadId?: string | null;
}) {
  const [memory] = await sql(
    `INSERT INTO client_memories (salon_id, customer_id, type, content, confidence, source_thread_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      args.salonId,
      args.customerId,
      args.type,
      args.content,
      args.confidence ?? 0.5,
      args.sourceThreadId || null,
    ]
  );

  return { success: true, memory };
}

export async function listClientMemories(args: { salonId: string; customerId: string; limit?: number }) {
  return sql(
    `SELECT id, type, content, confidence, source_thread_id, created_at
     FROM client_memories
     WHERE salon_id = $1 AND customer_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [args.salonId, args.customerId, args.limit ?? 8]
  );
}

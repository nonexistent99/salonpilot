import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne, sql } from '@/lib/db/neon';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const thread = await sqlOne(
    `SELECT t.*,
            c.name as customer_name,
            c.phone as customer_phone,
            c.whatsapp_phone,
            c.instagram,
            c.lifecycle_status,
            c.total_spent,
            c.average_ticket,
            s.name as service_name,
            a.start_time as appointment_start_time
     FROM conversation_threads t
     LEFT JOIN customers c ON c.id = t.customer_id
     LEFT JOIN services s ON s.id = t.service_in_focus_id
     LEFT JOIN appointments a ON a.id = t.appointment_id
     WHERE t.salon_id = $1 AND t.id = $2`,
    [auth.salonId, id]
  );

  if (!thread) return NextResponse.json({ error: 'Thread nao encontrada.' }, { status: 404 });

  const customerId = (thread as any).customer_id;
  const [memories, appointments, toolCalls] = await Promise.all([
    customerId
      ? sql(
          `SELECT id, type, content, confidence, created_at
           FROM client_memories
           WHERE salon_id = $1 AND customer_id = $2
           ORDER BY created_at DESC
           LIMIT 8`,
          [auth.salonId, customerId]
        )
      : Promise.resolve([]),
    customerId ? sql(
      `SELECT a.*, s.name as service_name, p.name as professional_name
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN professionals p ON p.id = a.professional_id
       WHERE a.salon_id = $1 AND a.customer_id = $2
       ORDER BY a.start_time DESC
       LIMIT 8`,
      [auth.salonId, customerId]
    ) : Promise.resolve([]),
    sql(
      `SELECT name, status, result_json, created_at
       FROM tool_calls
       WHERE salon_id = $1 AND thread_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [auth.salonId, id]
    ),
  ]);

  return NextResponse.json({ thread, memories, appointments, tool_calls: toolCalls });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const aiEnabled = typeof body.ai_enabled === 'boolean' ? body.ai_enabled : null;

  const thread = await sqlOne(
    `UPDATE conversation_threads
     SET ai_enabled = COALESCE($3::boolean, ai_enabled),
         updated_at = NOW()
     WHERE salon_id = $1 AND id = $2
     RETURNING *`,
    [auth.salonId, id, aiEnabled]
  );

  return NextResponse.json({ thread });
}

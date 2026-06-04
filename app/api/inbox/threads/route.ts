import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql } from '@/lib/db/neon';

export async function GET(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const q = searchParams.get('q');
  const leadStage = searchParams.get('lead_stage');

  const params: unknown[] = [auth.salonId];
  let where = `WHERE t.salon_id = $1`;
  let index = 2;

  if (status) {
    where += ` AND t.status = $${index}`;
    params.push(status);
    index++;
  }

  if (leadStage) {
    where += ` AND t.lead_stage = $${index}`;
    params.push(leadStage);
    index++;
  }

  if (q) {
    where += ` AND (c.name ILIKE $${index} OR t.phone ILIKE $${index})`;
    params.push(`%${q}%`);
    index++;
  }

  const threads = await sql(
    `SELECT t.*,
            c.name as customer_name,
            c.phone as customer_phone,
            c.whatsapp_phone,
            s.name as service_name,
            a.start_time as appointment_start_time,
            lm.content as last_message_content,
            lm.direction as last_message_direction
     FROM conversation_threads t
     LEFT JOIN customers c ON c.id = t.customer_id
     LEFT JOIN services s ON s.id = t.service_in_focus_id
     LEFT JOIN appointments a ON a.id = t.appointment_id
     LEFT JOIN LATERAL (
       SELECT content, direction
       FROM messages m
       WHERE m.thread_id = t.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON TRUE
     ${where}
     ORDER BY t.last_message_at DESC NULLS LAST
     LIMIT 100`,
    params
  );

  return NextResponse.json({ threads });
}

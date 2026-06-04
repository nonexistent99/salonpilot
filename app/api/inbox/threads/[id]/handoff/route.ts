import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql } from '@/lib/db/neon';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  await sql(
    `UPDATE conversation_threads
     SET status = 'human_handoff', ai_enabled = FALSE, updated_at = NOW()
     WHERE salon_id = $1 AND id = $2`,
    [auth.salonId, id]
  );

  await sql(
    `INSERT INTO lead_events (salon_id, thread_id, event_type, metadata)
     VALUES ($1, $2, 'human_handoff.manual', $3::jsonb)`,
    [auth.salonId, id, JSON.stringify({ reason: body.reason || 'manual' })]
  );

  return NextResponse.json({ success: true });
}

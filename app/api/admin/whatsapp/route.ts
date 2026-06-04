import { requireAdmin } from '@/lib/admin-guard';
import { sql } from '@/lib/db/neon';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const accounts = await sql(
    `SELECT wa.id, wa.salon_id, s.name as salon_name, wa.provider, wa.instance_name,
            wa.phone_number, wa.status, wa.last_connection_state, wa.webhook_url,
            wa.last_connected_at, wa.last_disconnected_at, wa.updated_at,
            MAX(we.created_at) as last_webhook_at
     FROM whatsapp_accounts wa
     LEFT JOIN salons s ON s.id = wa.salon_id
     LEFT JOIN whatsapp_events we ON we.whatsapp_account_id = wa.id
     GROUP BY wa.id, s.name
     ORDER BY wa.updated_at DESC`
  );

  const recentEvents = await sql(
    `SELECT we.id, we.whatsapp_account_id, s.name as salon_name, we.event_type,
            we.processed, we.error_message, we.created_at
     FROM whatsapp_events we
     LEFT JOIN salons s ON s.id = we.salon_id
     ORDER BY we.created_at DESC
     LIMIT 30`
  );

  return NextResponse.json({ accounts, recentEvents });
}

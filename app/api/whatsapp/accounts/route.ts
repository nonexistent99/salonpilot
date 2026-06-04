import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';
import { encryptSecret, maskSecret } from '@/services/admin/encryption-service';

export async function GET() {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const accounts = await sql(
    `SELECT id, provider, instance_name, phone_number, status, last_connection_state,
            last_qr_code, last_connected_at, last_disconnected_at, webhook_url, created_at, updated_at
     FROM whatsapp_accounts
     WHERE salon_id = $1
     ORDER BY created_at DESC`,
    [auth.salonId]
  );

  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const body = await request.json();
  const instanceName = String(body.instance_name || '').trim();
  if (!instanceName) {
    return NextResponse.json({ error: 'instance_name e obrigatorio.' }, { status: 400 });
  }

  const account = await sqlOne(
    `INSERT INTO whatsapp_accounts (
       salon_id, provider, evolution_base_url, instance_name, api_key_encrypted, phone_number, status
     )
     VALUES ($1, 'evolution', $2, $3, $4, $5, 'created')
     ON CONFLICT (salon_id, instance_name)
     DO UPDATE SET evolution_base_url = EXCLUDED.evolution_base_url,
                   api_key_encrypted = COALESCE(EXCLUDED.api_key_encrypted, whatsapp_accounts.api_key_encrypted),
                   phone_number = EXCLUDED.phone_number,
                   updated_at = NOW()
     RETURNING id, provider, instance_name, phone_number, status, webhook_url`,
    [
      auth.salonId,
      body.evolution_base_url || process.env.EVOLUTION_BASE_URL || null,
      instanceName,
      body.api_key ? encryptSecret(String(body.api_key)) : null,
      body.phone_number || null,
    ]
  );

  return NextResponse.json({
    account,
    secret_status: body.api_key ? maskSecret(String(body.api_key)) : null,
  });
}

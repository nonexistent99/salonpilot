import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql } from '@/lib/db/neon';
import { getMessagingProvider, getWhatsAppAccount } from '@/services/messaging/messaging-service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { id } = await context.params;
  const account = await getWhatsAppAccount(id);
  if (!account || account.salon_id !== auth.salonId) {
    return NextResponse.json({ error: 'Conta nao encontrada.' }, { status: 404 });
  }

  const provider: any = await getMessagingProvider(account);
  if (provider.disconnect) await provider.disconnect();

  await sql(
    `UPDATE whatsapp_accounts
     SET status = 'disconnected', last_disconnected_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [account.id]
  );

  return NextResponse.json({ success: true });
}

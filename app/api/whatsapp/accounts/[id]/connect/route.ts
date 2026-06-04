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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/webhooks/evolution/${account.id}`;

  if (provider.createInstance) await provider.createInstance();
  if (provider.setWebhook) await provider.setWebhook(webhookUrl);
  const qr = provider.getQRCode ? await provider.getQRCode() : null;

  await sql(
    `UPDATE whatsapp_accounts
     SET status = 'connecting',
         webhook_url = $2,
         last_qr_code = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [account.id, webhookUrl, typeof qr === 'string' ? qr : JSON.stringify(qr)]
  );

  return NextResponse.json({ success: true, webhook_url: webhookUrl, qr_code: qr });
}

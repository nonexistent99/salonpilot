import crypto from 'node:crypto';
import { encryptSecret, decryptSecret } from '@/services/admin/encryption-service';
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
  const token = decryptSecret(account.webhook_token_encrypted) || crypto.randomBytes(32).toString('hex');
  const publicPath = `${appUrl.replace(/\/+$/, '')}/api/webhooks/evolution/${account.id}`;
  const webhookUrl = `${publicPath}?token=${encodeURIComponent(token)}`;
  if (!account.webhook_token_encrypted) await sql(`UPDATE whatsapp_accounts SET webhook_token_encrypted = $2 WHERE id = $1`, [account.id, encryptSecret(token)]);

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
    [account.id, publicPath, typeof qr === 'string' ? qr : JSON.stringify(qr)]
  );

  return NextResponse.json({ success: true, webhook_url: publicPath, qr_code: qr });
}

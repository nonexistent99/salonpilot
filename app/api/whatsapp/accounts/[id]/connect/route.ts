import crypto from "node:crypto";
import { apiError } from "@/lib/api-error";
import {
  encryptSecret,
  decryptSecret,
} from "@/services/admin/encryption-service";
import { NextResponse } from "next/server";
import { requireSalon } from "@/lib/auth-server";
import { sql } from "@/lib/db/neon";
import {
  getMessagingProvider,
  getWhatsAppAccount,
} from "@/services/messaging/messaging-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSalon();
  if (!auth)
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const { id } = await context.params;
  const account = await getWhatsAppAccount(id);
  if (!account || account.salon_id !== auth.salonId) {
    return NextResponse.json(
      { error: "Conta nao encontrada." },
      { status: 404 },
    );
  }

  try {
    const provider: any = await getMessagingProvider(account);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || !appUrl.startsWith("https://"))
      throw new Error("NEXT_PUBLIC_APP_URL required");
    const secret =
      decryptSecret(account.webhook_secret_encrypted) ||
      crypto.randomBytes(32).toString("hex");
    const webhookUrl = `${appUrl.replace(/\/+$/, "")}/api/webhooks/evolution/${account.id}`;

    // Keep the persisted secret stable across reconnects and provider retries.
    await sql(
      "UPDATE whatsapp_accounts SET webhook_secret_encrypted=$2 WHERE id=$1 AND salon_id=$3",
      [account.id, encryptSecret(secret), auth.salonId],
    );
    if (account.status === "created") await provider.createInstance();
    await sql(
      "UPDATE whatsapp_accounts SET status='connecting' WHERE id=$1 AND salon_id=$2",
      [account.id, auth.salonId],
    );
    await provider.setWebhook(webhookUrl, secret);
    const qr = provider.getQRCode ? await provider.getQRCode() : null;

    await sql(
      `UPDATE whatsapp_accounts
     SET status = 'connecting',
         webhook_url = $2,
         last_qr_code = $3,
         updated_at = NOW()
     WHERE id = $1`,
      [
        account.id,
        webhookUrl,
        typeof qr === "string" ? qr : JSON.stringify(qr),
      ],
    );

    return NextResponse.json({
      success: true,
      webhook_url: webhookUrl,
      qr_code: qr,
    });
  } catch (error) {
    return apiError(error);
  }
}

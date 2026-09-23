import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { transaction } from "@/lib/db/neon";
import { getWhatsAppAccount } from "@/services/messaging/messaging-service";
import {
  normalizeEvolutionWebhook,
  shouldIgnoreMessage,
} from "@/services/messaging/webhook-normalizer";
import { decryptSecret } from "@/services/admin/encryption-service";
import { safeEqual } from "@/services/messaging/webhook-auth";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(accountId))
      return new Response("Not found", { status: 404 });
    const account = await getWhatsAppAccount(accountId);
    if (!account) return new Response("Not found", { status: 404 });
    const secret = decryptSecret(account.webhook_secret_encrypted);
    if (
      !secret ||
      !safeEqual(request.headers.get("x-webhook-secret") || "", secret)
    )
      return new Response("Forbidden", { status: 403 });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_000_000)
      return new Response("Too large", { status: 413 });
    const payload = JSON.parse(raw);
    if (payload.instance !== account.instance_name)
      return new Response("Instance mismatch", { status: 403 });
    const normalized = normalizeEvolutionWebhook(payload);
    const hash = crypto
      .createHash("sha256")
      .update(`${account.id}:${normalized?.eventHash || raw}`)
      .digest("hex");
    await transaction(async (client) => {
      const event = await client.query(
        `INSERT INTO whatsapp_events(whatsapp_account_id,salon_id,event_hash,event_type,payload_json) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(event_hash) DO NOTHING RETURNING id`,
        [
          account.id,
          account.salon_id,
          hash,
          payload.event,
          JSON.stringify(payload),
        ],
      );
      if (!event.rowCount) return;
      if (
        String(payload.event).toLowerCase().replaceAll("_", ".") ===
        "connection.update"
      ) {
        const state = String(payload.data?.state || "unknown");
        await client.query(
          `UPDATE whatsapp_accounts SET last_connection_state=$2,status=CASE WHEN $2='open' THEN 'connected' WHEN $2='close' THEN 'disconnected' ELSE 'connecting' END,last_connected_at=CASE WHEN $2='open' THEN NOW() ELSE last_connected_at END,last_disconnected_at=CASE WHEN $2='close' THEN NOW() ELSE last_disconnected_at END,updated_at=NOW() WHERE id=$1`,
          [account.id, state],
        );
      }
      if (
        normalized &&
        !shouldIgnoreMessage(normalized) &&
        normalized.providerMessageId &&
        normalized.phone
      ) {
        const n = normalized;
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`wa-contact:${account.salon_id}:${n.phone}`],
        );
        const duplicate = await client.query(
          "SELECT id FROM messages WHERE salon_id=$1 AND whatsapp_account_id=$2 AND provider_message_id=$3",
          [account.salon_id, account.id, n.providerMessageId],
        );
        if (duplicate.rowCount) return;
        const customer = await client.query(
          "SELECT id FROM customers WHERE salon_id=$1 AND (phone=$2 OR whatsapp_phone=$2) LIMIT 1",
          [account.salon_id, n.phone],
        );
        let customerId = customer.rows[0]?.id;
        if (!customerId) {
          const created = await client.query(
            "INSERT INTO customers(salon_id,name,phone,whatsapp_phone,source) VALUES($1,$2,$3,$3,'whatsapp') RETURNING id",
            [account.salon_id, n.pushName || n.phone, n.phone],
          );
          customerId = created.rows[0].id;
        }
        const existing = await client.query(
          "SELECT id FROM conversation_threads WHERE salon_id=$1 AND whatsapp_account_id=$2 AND remote_jid=$3 AND status IN ('active','waiting_client','human_handoff') FOR UPDATE",
          [account.salon_id, account.id, n.remoteJid],
        );
        let threadId = existing.rows[0]?.id;
        if (!threadId) {
          const created = await client.query(
            `INSERT INTO conversation_threads(salon_id,customer_id,whatsapp_account_id,channel,remote_jid,phone,last_inbound_at,last_message_at) VALUES($1,$2,$3,'whatsapp',$4,$5,$6,$6) RETURNING id`,
            [
              account.salon_id,
              customerId,
              account.id,
              n.remoteJid,
              n.phone,
              n.timestamp,
            ],
          );
          threadId = created.rows[0].id;
        }
        const unsupported = n.messageType !== "text";
        await client.query(
          `INSERT INTO messages(salon_id,thread_id,customer_id,whatsapp_account_id,direction,sender_type,channel,provider,provider_message_id,message_type,content,media_url,created_at) VALUES($1,$2,$3,$4,'inbound','client','whatsapp','evolution',$5,$6,$7,$8,$9)`,
          [
            account.salon_id,
            threadId,
            customerId,
            account.id,
            n.providerMessageId,
            n.messageType,
            n.text,
            n.mediaUrl,
            n.timestamp,
          ],
        );
        await client.query(
          `UPDATE conversation_threads SET last_inbound_at=GREATEST(last_inbound_at,$3::timestamptz),last_message_at=GREATEST(last_message_at,$3::timestamptz),updated_at=NOW(),status=CASE WHEN $4 THEN 'human_handoff' WHEN status='waiting_client' THEN 'active' ELSE status END,ai_enabled=CASE WHEN $4 THEN FALSE ELSE ai_enabled END WHERE salon_id=$1 AND id=$2`,
          [account.salon_id, threadId, n.timestamp, unsupported],
        );
        if (!unsupported)
          await client.query(
            `INSERT INTO message_batches(salon_id,thread_id,scheduled_for) VALUES($1,$2,NOW()+INTERVAL '6 seconds') ON CONFLICT(salon_id,thread_id) WHERE status='scheduled' DO UPDATE SET scheduled_for=EXCLUDED.scheduled_for,updated_at=NOW()`,
            [account.salon_id, threadId],
          );
      }
      await client.query(
        "UPDATE whatsapp_events SET processed=TRUE WHERE id=$1",
        [event.rows[0].id],
      );
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to persist event" },
      { status: 503 },
    );
  }
}

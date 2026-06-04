import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { sql, sqlOne } from '@/lib/db/neon';
import { findOrCreateCustomerByPhone } from '@/services/crm/client-service';
import { enqueueMessageBatch } from '@/services/messaging/message-buffer';
import { getWhatsAppAccount } from '@/services/messaging/messaging-service';
import { normalizeEvolutionWebhook, shouldIgnoreMessage } from '@/services/messaging/webhook-normalizer';
import { runCustomerAgent } from '@/services/ai/ai-agent-runner';

function hashPayload(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const payload = await request.json();
  const account = await getWhatsAppAccount(accountId);

  if (!account) {
    return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
  }

  const normalized = normalizeEvolutionWebhook(payload);
  const eventHash = normalized?.eventHash || hashPayload(payload);

  const event = await sqlOne<{ id: string }>(
    `INSERT INTO whatsapp_events (
       whatsapp_account_id, salon_id, provider, event_id, event_hash, event_type, payload_json
     )
     VALUES ($1, $2, 'evolution', $3, $4, $5, $6::jsonb)
     ON CONFLICT (event_hash) DO NOTHING
     RETURNING id`,
    [
      account.id,
      account.salon_id,
      normalized?.eventId || null,
      eventHash,
      normalized?.eventType || payload?.event || null,
      JSON.stringify(payload),
    ]
  );

  if (!event) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!normalized || shouldIgnoreMessage(normalized)) {
    await sql(`UPDATE whatsapp_events SET processed = TRUE WHERE id = $1`, [event.id]);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const existingMessage = normalized.providerMessageId
    ? await sqlOne<{ id: string }>(
        `SELECT id FROM messages WHERE whatsapp_account_id = $1 AND provider_message_id = $2`,
        [account.id, normalized.providerMessageId]
      )
    : null;

  if (existingMessage) {
    await sql(`UPDATE whatsapp_events SET processed = TRUE WHERE id = $1`, [event.id]);
    return NextResponse.json({ ok: true, duplicate_message: true });
  }

  const customer = await findOrCreateCustomerByPhone({
    salonId: account.salon_id,
    phone: normalized.phone,
    name: normalized.pushName,
    source: 'whatsapp',
  });

  if (!customer) throw new Error('Unable to create customer');

  let thread = await sqlOne<{ id: string }>(
    `SELECT id
     FROM conversation_threads
     WHERE salon_id = $1
       AND whatsapp_account_id = $2
       AND remote_jid = $3
       AND status IN ('active', 'waiting_client', 'human_handoff')
     ORDER BY updated_at DESC
     LIMIT 1`,
    [account.salon_id, account.id, normalized.remoteJid]
  );

  if (!thread) {
    thread = await sqlOne<{ id: string }>(
      `INSERT INTO conversation_threads (
         salon_id, customer_id, whatsapp_account_id, channel, remote_jid, phone,
         status, ai_enabled, lead_stage, last_inbound_at, last_message_at
       )
       VALUES ($1, $2, $3, 'whatsapp', $4, $5, 'active', TRUE, 'new', $6, $6)
       RETURNING id`,
      [account.salon_id, customer.id, account.id, normalized.remoteJid, normalized.phone, normalized.timestamp]
    );
  } else {
    await sql(
      `UPDATE conversation_threads
       SET customer_id = $3,
           phone = $4,
           status = CASE WHEN status = 'waiting_client' THEN 'active' ELSE status END,
           last_inbound_at = $5,
           last_message_at = $5,
           updated_at = NOW()
       WHERE salon_id = $1 AND id = $2`,
      [account.salon_id, thread.id, customer.id, normalized.phone, normalized.timestamp]
    );
  }

  await sql(
    `INSERT INTO messages (
       salon_id, thread_id, customer_id, whatsapp_account_id, direction, sender_type,
       channel, provider, provider_message_id, message_type, content, media_url, metadata, created_at
     )
     VALUES ($1, $2, $3, $4, 'inbound', 'client', 'whatsapp', 'evolution', $5, $6, $7, $8, $9::jsonb, $10)`,
    [
      account.salon_id,
      thread!.id,
      customer.id,
      account.id,
      normalized.providerMessageId,
      normalized.messageType,
      normalized.text,
      normalized.mediaUrl,
      JSON.stringify({ remote_jid: normalized.remoteJid, push_name: normalized.pushName }),
      normalized.timestamp,
    ]
  );

  await enqueueMessageBatch({ salonId: account.salon_id, threadId: thread!.id, delaySeconds: 6 });
  await sql(`UPDATE whatsapp_events SET processed = TRUE WHERE id = $1`, [event.id]);

  if (process.env.SALONPILOT_PROCESS_WEBHOOK_SYNC === 'true') {
    await runCustomerAgent({ salonId: account.salon_id, threadId: thread!.id });
  }

  return NextResponse.json({ ok: true, thread_id: thread!.id });
}

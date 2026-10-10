import { transaction } from "@/lib/db/neon";
export async function ingestInstagramEvent(
  account: {
    id: string;
    salon_id: string;
    instagram_user_id: string;
    ai_enabled: boolean;
  },
  event: any,
) {
  const sender = String(event.sender?.id || "");
  const text =
    typeof event.message?.text === "string"
      ? event.message.text.slice(0, 8000)
      : "";
  const mid = typeof event.message?.mid === "string" ? event.message.mid : "";
  if (
    !mid ||
    mid.length > 512 ||
    !/^\d+$/.test(sender) ||
    String(event.recipient?.id) !== account.instagram_user_id ||
    event.message?.is_echo ||
    sender === account.instagram_user_id
  )
    return;
  const timestamp = Number(event.timestamp);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000) return;
  const receivedAt = new Date(timestamp).toISOString();
  await transaction(async (client) => {
    // All inbound effects commit together, so a provider retry can recover a failed delivery.
    const dedup = await client.query(
      "INSERT INTO channel_events(account_id,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING event_id",
      [account.id, mid],
    );
    if (!dedup.rowCount) return;
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `ig-contact:${account.id}:${sender}`,
    ]);
    const contact = await client.query(
      "SELECT customer_id FROM instagram_contacts WHERE account_id=$1 AND sender_id=$2",
      [account.id, sender],
    );
    let customerId = contact.rows[0]?.customer_id;
    if (!customerId) {
      const customer = await client.query(
        "INSERT INTO customers(salon_id,name,source) VALUES($1,'Cliente Instagram','instagram') RETURNING id",
        [account.salon_id],
      );
      customerId = customer.rows[0].id;
      await client.query(
        "INSERT INTO instagram_contacts(account_id,sender_id,customer_id) VALUES($1,$2,$3)",
        [account.id, sender, customerId],
      );
    }
    const active = await client.query(
      "SELECT id FROM conversation_threads WHERE salon_id=$1 AND instagram_account_id=$2 AND instagram_sender_id=$3 AND status IN ('active','waiting_client','human_handoff') FOR UPDATE",
      [account.salon_id, account.id, sender],
    );
    let threadId = active.rows[0]?.id;
    if (!threadId) {
      const thread = await client.query(
        `INSERT INTO conversation_threads(salon_id,customer_id,channel,instagram_account_id,instagram_sender_id,ai_enabled,last_inbound_at,last_message_at) VALUES($1,$2,'instagram',$3,$4,$5,$6,$6) RETURNING id`,
        [
          account.salon_id,
          customerId,
          account.id,
          sender,
          account.ai_enabled,
          receivedAt,
        ],
      );
      threadId = thread.rows[0].id;
    }
    await client.query(
      `INSERT INTO messages(salon_id,thread_id,customer_id,direction,sender_type,channel,provider,provider_message_id,message_type,content,created_at) VALUES($1,$2,$3,'inbound','client','instagram','meta',$4,$5,$6,$7)`,
      [
        account.salon_id,
        threadId,
        customerId,
        mid,
        text ? "text" : "unsupported",
        text || "[Mídia recebida: atendimento humano necessário]",
        receivedAt,
      ],
    );
    await client.query(
      `UPDATE conversation_threads SET last_inbound_at=GREATEST(last_inbound_at,$3::timestamptz),last_message_at=GREATEST(last_message_at,$3::timestamptz),updated_at=NOW(),status=CASE WHEN $4 THEN 'human_handoff' WHEN status='waiting_client' THEN 'active' ELSE status END,ai_enabled=CASE WHEN $4 THEN FALSE ELSE ai_enabled END WHERE salon_id=$1 AND id=$2`,
      [account.salon_id, threadId, receivedAt, !text],
    );
    if (text && account.ai_enabled)
      await client.query(
        `INSERT INTO message_batches(salon_id,thread_id,scheduled_for) VALUES($1,$2,NOW()+INTERVAL '6 seconds') ON CONFLICT(salon_id,thread_id) WHERE status='scheduled' DO UPDATE SET scheduled_for=EXCLUDED.scheduled_for,updated_at=NOW()`,
        [account.salon_id, threadId],
      );
  });
}

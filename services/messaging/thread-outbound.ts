import crypto from "node:crypto";
import { sql, sqlOne, transaction } from "@/lib/db/neon";
import { ApiError } from "@/lib/api-error";
import { getMessagingProvider, getWhatsAppAccount } from "./messaging-service";
import {
  accountToken,
  instagramFetch,
  type InstagramAccount,
} from "@/services/social/instagram";
export async function sendThreadText(args: {
  salonId: string;
  threadId: string;
  text: string;
  senderType: "ai" | "human" | "system";
  idempotencyKey: string;
}) {
  const thread = await sqlOne(
    "SELECT * FROM conversation_threads WHERE salon_id=$1 AND id=$2",
    [args.salonId, args.threadId],
  );
  if (!thread) throw new ApiError(404, "Conversa não encontrada.");
  const account =
    thread.channel === "instagram"
      ? await sqlOne<InstagramAccount>(
          "SELECT * FROM instagram_accounts WHERE salon_id=$1 AND id=$2",
          [args.salonId, thread.instagram_account_id],
        )
      : null;
  if (
    args.senderType === "ai" &&
    (!thread.ai_enabled ||
      thread.status === "human_handoff" ||
      (account && !account.ai_enabled))
  )
    throw new ApiError(409, "O atendimento automático está pausado.");
  if (
    thread.channel === "instagram" &&
    (!account ||
      account.status !== "connected" ||
      !thread.last_inbound_at ||
      Date.now() - new Date(thread.last_inbound_at).getTime() >=
        24 * 60 * 60 * 1000)
  )
    throw new ApiError(
      422,
      "Instagram desconectado ou fora da janela de 24 horas.",
    );
  if (thread.channel === "instagram" && Buffer.byteLength(args.text) > 1000)
    throw new ApiError(
      422,
      "A resposta excede 1000 bytes permitidos pelo Instagram.",
    );
  // Claim before the provider call. An ambiguous network failure must never auto-send twice.
  const key = crypto
    .createHash("sha256")
    .update(`${args.salonId}:${args.threadId}:${args.idempotencyKey}`)
    .digest("hex");
  const outbox = await sqlOne(
    `INSERT INTO channel_outbox(salon_id,thread_id,idempotency_key,content,status) VALUES($1,$2,$3,$4,'sending') ON CONFLICT DO NOTHING RETURNING id`,
    [args.salonId, args.threadId, key, args.text],
  );
  if (!outbox) {
    const existing = await sqlOne(
      "SELECT status FROM channel_outbox WHERE salon_id=$1 AND thread_id=$2 AND idempotency_key=$3",
      [args.salonId, args.threadId, key],
    );
    if (existing?.status === "sent") return { success: true, duplicate: true };
    throw new ApiError(
      409,
      "Entrega pendente de conferência na caixa de entrada.",
    );
  }
  try {
    let providerId: string | null = null;
    if (thread.channel === "instagram" && account) {
      const data = await instagramFetch(
        accountToken(account),
        `${account.instagram_user_id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            recipient: { id: thread.instagram_sender_id },
            message: { text: args.text },
          }),
        },
      );
      if (!data.message_id)
        throw new Error("Provider did not confirm delivery");
      providerId = data.message_id;
    } else if (thread.channel === "whatsapp") {
      const wa = await getWhatsAppAccount(thread.whatsapp_account_id);
      if (!wa || wa.salon_id !== args.salonId || !thread.phone)
        throw new Error("WhatsApp account not found");
      const provider = await getMessagingProvider(wa);
      const result: any = await provider.sendText({
        to: thread.phone,
        text: args.text,
      });
      providerId = result?.key?.id || result?.messageId || result?.id || null;
      if (!providerId) throw new Error("Provider did not confirm delivery");
    } else throw new Error("Unsupported channel");
    await transaction(async (client) => {
      await client.query(
        "UPDATE channel_outbox SET status='sent',provider_message_id=$2,updated_at=NOW() WHERE id=$1",
        [outbox.id, providerId],
      );
      await client.query(
        `INSERT INTO messages(salon_id,thread_id,customer_id,whatsapp_account_id,direction,sender_type,channel,provider,provider_message_id,message_type,content,sent_at) VALUES($1,$2,$3,$4,'outbound',$5,$6,$7,$8,'text',$9,NOW())`,
        [
          args.salonId,
          args.threadId,
          thread.customer_id,
          thread.whatsapp_account_id,
          args.senderType,
          thread.channel,
          thread.channel === "instagram" ? "meta" : "evolution",
          providerId,
          args.text,
        ],
      );
      await client.query(
        "UPDATE conversation_threads SET last_outbound_at=NOW(),last_message_at=NOW(),updated_at=NOW() WHERE salon_id=$1 AND id=$2",
        [args.salonId, args.threadId],
      );
    });
    return { success: true };
  } catch (error) {
    await sql(
      "UPDATE channel_outbox SET status='needs_review',updated_at=NOW() WHERE id=$1",
      [outbox.id],
    );
    await sql(
      "UPDATE conversation_threads SET status='human_handoff',ai_enabled=FALSE,updated_at=NOW() WHERE salon_id=$1 AND id=$2",
      [args.salonId, args.threadId],
    );
    throw error;
  }
}

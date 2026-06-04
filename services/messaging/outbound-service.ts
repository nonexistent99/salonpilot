import { sql, sqlOne } from '@/lib/db/neon';
import { getMessagingProvider, getWhatsAppAccount } from './messaging-service';
import { normalizePhone } from '@/services/crm/client-service';

export async function sendWhatsAppText(args: {
  salonId: string;
  accountId: string;
  threadId?: string | null;
  customerId?: string | null;
  toPhone: string;
  text: string;
  senderType?: 'ai' | 'human' | 'system';
}) {
  const account = await getWhatsAppAccount(args.accountId);
  if (!account || account.salon_id !== args.salonId) {
    throw new Error('WhatsApp account not found');
  }

  const provider = await getMessagingProvider(account);
  const to = normalizePhone(args.toPhone);

  const outbox = await sqlOne<{ id: string }>(
    `INSERT INTO whatsapp_outbox (salon_id, whatsapp_account_id, thread_id, customer_id, to_phone, content, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [args.salonId, args.accountId, args.threadId || null, args.customerId || null, to, args.text]
  );

  try {
    const result: any = await provider.sendText({ to, text: args.text });
    const providerMessageId = result?.key?.id || result?.messageId || result?.id || null;

    await sql(
      `UPDATE whatsapp_outbox
       SET status = 'sent', provider_message_id = $2, sent_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [outbox?.id, providerMessageId]
    );

    if (args.threadId) {
      await sql(
        `INSERT INTO messages (
           salon_id, thread_id, customer_id, whatsapp_account_id, direction, sender_type,
           channel, provider, provider_message_id, message_type, content, sent_at
         )
         VALUES ($1, $2, $3, $4, 'outbound', $5, 'whatsapp', 'evolution', $6, 'text', $7, NOW())`,
        [
          args.salonId,
          args.threadId,
          args.customerId || null,
          args.accountId,
          args.senderType || 'ai',
          providerMessageId,
          args.text,
        ]
      );

      await sql(
        `UPDATE conversation_threads
         SET last_outbound_at = NOW(), last_message_at = NOW(), updated_at = NOW()
         WHERE salon_id = $1 AND id = $2`,
        [args.salonId, args.threadId]
      );
    }

    return { success: true, provider_message_id: providerMessageId };
  } catch (error) {
    await sql(
      `UPDATE whatsapp_outbox
       SET status = 'failed', error_message = $2, updated_at = NOW()
       WHERE id = $1`,
      [outbox?.id, error instanceof Error ? error.message : 'Unknown error']
    );
    throw error;
  }
}

import crypto from 'crypto';
import { phoneFromJid } from '@/services/crm/client-service';

export type NormalizedWebhookMessage = {
  eventHash: string;
  eventId: string | null;
  eventType: string | null;
  instanceName: string | null;
  remoteJid: string;
  phone: string;
  fromMe: boolean;
  isGroup: boolean;
  messageType: string;
  text: string | null;
  mediaUrl: string | null;
  providerMessageId: string | null;
  timestamp: string;
  pushName: string | null;
  raw: unknown;
};

function stableHash(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function extractText(message: any): string | null {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.buttonsResponseMessage?.selectedDisplayText ||
    message?.listResponseMessage?.title ||
    null
  );
}

function extractMediaUrl(message: any): string | null {
  return (
    message?.imageMessage?.url ||
    message?.videoMessage?.url ||
    message?.audioMessage?.url ||
    message?.documentMessage?.url ||
    null
  );
}

function detectMessageType(message: any): string {
  if (!message) return 'unknown';
  if (message.conversation || message.extendedTextMessage) return 'text';
  if (message.imageMessage) return 'image';
  if (message.audioMessage) return 'audio';
  if (message.videoMessage) return 'video';
  if (message.documentMessage) return 'document';
  return Object.keys(message)[0] || 'unknown';
}

export function normalizeEvolutionWebhook(payload: any): NormalizedWebhookMessage | null {
  const data = payload?.data || payload;
  const key = data?.key || payload?.key || {};
  const message = data?.message || payload?.message || {};
  const remoteJid = key?.remoteJid || data?.remoteJid || data?.jid || '';
  const fromMe = Boolean(key?.fromMe || data?.fromMe);
  const isGroup = remoteJid.includes('@g.us') || Boolean(data?.isGroup);
  const text = extractText(message);
  const mediaUrl = extractMediaUrl(message);
  const messageType = detectMessageType(message);
  const providerMessageId = key?.id || data?.id || payload?.messageId || null;
  const timestampRaw = data?.messageTimestamp || data?.timestamp || payload?.date_time || Date.now();
  const timestampDate = typeof timestampRaw === 'number'
    ? new Date(timestampRaw > 10_000_000_000 ? timestampRaw : timestampRaw * 1000)
    : new Date(timestampRaw);
  const timestamp = Number.isNaN(timestampDate.getTime())
    ? new Date().toISOString()
    : timestampDate.toISOString();

  if (!remoteJid && !providerMessageId) return null;

  return {
    eventHash: stableHash({ providerMessageId, remoteJid, text, timestamp, event: payload?.event }),
    eventId: payload?.id || payload?.eventId || providerMessageId,
    eventType: payload?.event || payload?.type || null,
    instanceName: payload?.instance || data?.instance || null,
    remoteJid,
    phone: phoneFromJid(remoteJid),
    fromMe,
    isGroup,
    messageType,
    text,
    mediaUrl,
    providerMessageId,
    timestamp,
    pushName: data?.pushName || data?.notifyName || null,
    raw: payload,
  };
}

export function shouldIgnoreMessage(message: NormalizedWebhookMessage): boolean {
  return message.fromMe || message.isGroup || (!message.text && !message.mediaUrl);
}

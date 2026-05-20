/**
 * SalonPilot — Zaia Service
 *
 * Zaia é a camada operacional de comunicação. Executa, não pensa.
 *
 * O envio proativo de WhatsApp pelo Zaia é feito via Workflow Capture URL:
 * a dona configura um Workflow no painel Zaia com:
 *   1. Webhook Request Node → recebe nossa chamada
 *   2. Message Sending Tool (ou equivalente) → envia a mensagem
 *
 * A URL do Webhook Request Node é colada em ZAIA_WORKFLOW_CAPTURE_URL.
 *
 * Toda chamada registra evento via `events.ts` para alimentar Learning Layer.
 */

import { recordEvent } from './events';

export interface SendMessageInput {
  salonId: string;
  customerId?: string | null;
  phone: string;        // E.164 ou nacional, depende do agente Zaia
  message: string;
  campaignId?: string | null;
  customerName?: string | null;
  /** Reference for our side to correlate (we'll forward as external_id). */
  externalId?: string | null;
  /** Extra fields the Zaia workflow may read (campaign objective, offer, etc). */
  meta?: Record<string, unknown>;
}

export interface SendMessageResult {
  ok: boolean;
  status: number;
  /** Whatever the workflow returned (id, run_id, message_id, etc) — opaque. */
  response?: unknown;
  error?: string;
}

function getZaiaConfig() {
  return {
    apiKey: process.env.ZAIA_API_KEY,
    captureUrl: process.env.ZAIA_WORKFLOW_CAPTURE_URL,
  };
}

/**
 * Sends a proactive WhatsApp message through the configured Zaia workflow.
 *
 * NOTE: if ZAIA_WORKFLOW_CAPTURE_URL is empty, this returns a structured
 * "not configured" result without throwing — so the rest of the loop
 * (campaign creation, learning) keeps functioning in dry-run mode.
 */
export async function sendWhatsAppMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const { apiKey, captureUrl } = getZaiaConfig();

  // Dry-run mode: Zaia not configured yet. Still record the intent so we can
  // see in business_events what WOULD have gone out.
  if (!captureUrl) {
    await recordEvent({
      salonId: input.salonId,
      customerId: input.customerId,
      eventType: 'zaia.message.failed',
      channel: 'whatsapp',
      source: 'system',
      text: `[dry-run] Zaia workflow URL não configurada. Mensagem destinada a ${input.phone}.`,
      data: {
        phone: input.phone,
        message: input.message,
        campaign_id: input.campaignId,
        reason: 'ZAIA_WORKFLOW_CAPTURE_URL not set',
      },
    });
    return { ok: false, status: 0, error: 'ZAIA_WORKFLOW_CAPTURE_URL not set (dry-run)' };
  }

  const body = {
    salon_id: input.salonId,
    customer_id: input.customerId ?? null,
    customer_name: input.customerName ?? null,
    phone: input.phone,
    message: input.message,
    campaign_id: input.campaignId ?? null,
    external_id: input.externalId ?? null,
    meta: input.meta ?? {},
  };

  try {
    const res = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    let response: unknown = null;
    const text = await res.text();
    try { response = text ? JSON.parse(text) : null; } catch { response = text; }

    if (!res.ok) {
      await recordEvent({
        salonId: input.salonId,
        customerId: input.customerId,
        eventType: 'zaia.message.failed',
        channel: 'whatsapp',
        source: 'system',
        text: `Falha ao enviar WhatsApp via Zaia (HTTP ${res.status}).`,
        data: { phone: input.phone, campaign_id: input.campaignId, http_status: res.status, response },
      });
      return { ok: false, status: res.status, response, error: `HTTP ${res.status}` };
    }

    await recordEvent({
      salonId: input.salonId,
      customerId: input.customerId,
      eventType: 'zaia.message.sent',
      channel: 'whatsapp',
      source: 'system',
      text: `Mensagem WhatsApp enviada via Zaia para ${input.customerName ?? input.phone}.`,
      data: {
        phone: input.phone,
        campaign_id: input.campaignId,
        external_id: input.externalId,
        message_preview: input.message.slice(0, 120),
      },
    });

    return { ok: true, status: res.status, response };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await recordEvent({
      salonId: input.salonId,
      customerId: input.customerId,
      eventType: 'zaia.message.failed',
      channel: 'whatsapp',
      source: 'system',
      text: `Erro de rede ao chamar Zaia: ${msg}`,
      data: { phone: input.phone, campaign_id: input.campaignId, error: msg },
    });
    return { ok: false, status: 0, error: msg };
  }
}

/** Quick readiness check used by /api/health and admin diagnostics. */
export function zaiaStatus() {
  const cfg = getZaiaConfig();
  return {
    api_key_configured: !!cfg.apiKey,
    workflow_url_configured: !!cfg.captureUrl,
    ready: !!cfg.apiKey && !!cfg.captureUrl,
  };
}

/**
 * SalonPilot — Event Layer
 *
 * Tudo que acontece no sistema vira evento estruturado em `business_events`.
 * Essa tabela alimenta KPI Engine + Learning Layer + Memória estratégica.
 *
 * Princípio: NINGUÉM escreve em business_events fora desse módulo.
 * Se você precisa registrar algo, importe `recordEvent`.
 */

import { sqlOne } from '@/lib/db/neon';

export type EventType =
  // Intelligence events (sistema observando)
  | 'intelligence.inactive_detected'      // cron detectou clientes sumidas
  | 'intelligence.empty_slots_detected'   // agenda vazia identificada
  | 'intelligence.opportunity_found'      // upsell, cross-sell, padrão estratégico
  | 'intelligence.campaign_planned'       // IA decidiu criar campanha
  | 'intelligence.kpi_snapshot_taken'     // snapshot diário salvo
  // Action events (sistema agindo)
  | 'campaign.created'
  | 'campaign.dispatched'                 // ação enviada pra Zaia
  | 'campaign.completed'
  // Zaia outbound
  | 'zaia.message.sent'
  | 'zaia.message.failed'
  // Zaia inbound (vindo do webhook)
  | 'zaia.conversation.started'
  | 'zaia.message.received'
  | 'zaia.lead.captured'
  // Business outcomes (resultados que importam)
  | 'appointment.created'
  | 'appointment.booked_via_campaign'
  | 'appointment.completed'
  | 'appointment.no_show'
  | 'appointment.canceled'
  | 'customer.created'
  | 'customer.reactivated'
  | 'customer.churned'
  // Learning
  | 'learning.experiment_closed'
  | 'learning.note_recorded';

export interface RecordEventInput {
  salonId: string;
  eventType: EventType;
  customerId?: string | null;
  /** 'whatsapp' | 'instagram' | 'system' | 'web' | etc. */
  channel?: string | null;
  /** Where the event originated: 'cron' | 'webhook_zaia' | 'user_action' | 'ai_decision' */
  source?: string | null;
  /** Short human-readable description (used in feeds/UI). */
  text?: string | null;
  /** Structured payload — use for IDs, scores, deltas, anything the Learning Layer needs. */
  data?: Record<string, unknown> | null;
  /** When did this actually happen (defaults to NOW). Useful for backfills/webhook delays. */
  occurredAt?: Date | string | null;
}

/**
 * Records a structured business event. Idempotency is the caller's responsibility
 * (use deterministic IDs in `data` to dedupe later if needed).
 */
export async function recordEvent(input: RecordEventInput): Promise<{ id: string } | null> {
  try {
    const row = await sqlOne<{ id: string }>(
      `INSERT INTO business_events
        (salon_id, customer_id, event_type, channel, source, event_text, structured_data_json, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
       RETURNING id`,
      [
        input.salonId,
        input.customerId ?? null,
        input.eventType,
        input.channel ?? null,
        input.source ?? null,
        input.text ?? null,
        input.data ? JSON.stringify(input.data) : '{}',
        input.occurredAt ?? null,
      ]
    );
    return row;
  } catch (err) {
    // Event recording must NEVER break the caller's flow. Log + swallow.
    console.error('[events] failed to record', input.eventType, err);
    return null;
  }
}

/**
 * Records multiple events in one round-trip. Use when ingesting batches
 * (e.g. campaign dispatch generating N "message.sent" events).
 */
export async function recordEvents(inputs: RecordEventInput[]): Promise<void> {
  for (const e of inputs) {
    await recordEvent(e);
  }
}

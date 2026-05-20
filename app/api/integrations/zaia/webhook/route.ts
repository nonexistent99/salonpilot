/**
 * POST /api/integrations/zaia/webhook
 *
 * Recebe eventos da Zaia (camada operacional).
 * Cada evento vira:
 *   - mutação estruturada no DB (customer, appointment, campaign counters)
 *   - business_events (Event Layer) para alimentar Learning Layer
 *   - quando booking de campanha → fecha experimento via Learning Layer
 *
 * Em produção: validar HMAC do header Zaia (a fazer quando docs forem confirmados).
 */

import { NextResponse } from 'next/server';
import { sql, sqlOne } from '@/lib/db/neon';
import { recordEvent } from '@/services/events';
import { closeExperimentForCampaign } from '@/services/learning';

interface ZaiaWebhookBody {
  event: string;
  salon_id: string;
  data?: Record<string, unknown> | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as ZaiaWebhookBody;
    const { event, data, salon_id: salonId } = body;

    if (!event || !salonId) {
      return NextResponse.json({ error: 'Payload inválido (event + salon_id obrigatórios).' }, { status: 400 });
    }

    const salon = await sqlOne<{ id: string }>(
      `SELECT id FROM salons WHERE id = $1`,
      [salonId]
    );
    if (!salon) return NextResponse.json({ error: 'Salão não encontrado.' }, { status: 404 });

    // Sempre persistir o evento bruto da Zaia para auditoria/replay
    await sql(
      `INSERT INTO zaia_events (salon_id, event_type, payload_json, processed)
       VALUES ($1, $2, $3, TRUE)`,
      [salonId, event, JSON.stringify(body)]
    ).catch(() => undefined);

    switch (event) {
      case 'conversation.started':
      case 'lead.captured': {
        const { name, phone, source } = (data || {}) as {
          name?: string; phone?: string; source?: string;
        };
        if (name || phone) {
          await sql(
            `INSERT INTO customers (salon_id, name, phone, status, source, created_at)
             VALUES ($1, $2, $3, 'hot', $4, NOW())
             ON CONFLICT (salon_id, phone) DO UPDATE
               SET status = 'hot', updated_at = NOW()`,
            [salonId, name || 'Lead Zaia', phone || null, source || 'zaia']
          ).catch(() => undefined);
        }
        await recordEvent({
          salonId,
          eventType: 'zaia.lead.captured',
          channel: 'whatsapp',
          source: 'webhook_zaia',
          text: `Lead captado via Zaia${name ? `: ${name}` : ''}.`,
          data: data || {},
        });
        break;
      }

      case 'message.received':
      case 'customer.replied': {
        const { phone, message, campaign_id, recipient_id } = (data || {}) as {
          phone?: string; message?: string; campaign_id?: string; recipient_id?: string;
        };

        let customerId: string | null = null;
        if (phone) {
          const c = await sqlOne<{ id: string }>(
            `SELECT id FROM customers WHERE salon_id = $1 AND phone = $2 LIMIT 1`,
            [salonId, phone]
          );
          customerId = c?.id || null;
        }

        // Se a resposta veio de uma campanha, marca recipient + incrementa contador
        if (campaign_id) {
          if (recipient_id) {
            await sql(
              `UPDATE campaign_recipients
                  SET status = CASE WHEN status IN ('sent','delivered') THEN 'responded' ELSE status END,
                      responded_at = COALESCE(responded_at, NOW())
                WHERE id = $1`,
              [recipient_id]
            ).catch(() => undefined);
          } else if (customerId) {
            await sql(
              `UPDATE campaign_recipients
                  SET status = CASE WHEN status IN ('sent','delivered') THEN 'responded' ELSE status END,
                      responded_at = COALESCE(responded_at, NOW())
                WHERE campaign_id = $1 AND customer_id = $2`,
              [campaign_id, customerId]
            ).catch(() => undefined);
          }
          await sql(
            `UPDATE campaigns
                SET responded_count = responded_count + 1, updated_at = NOW()
              WHERE id = $1 AND salon_id = $2`,
            [campaign_id, salonId]
          ).catch(() => undefined);
        }

        await recordEvent({
          salonId,
          customerId,
          eventType: 'zaia.message.received',
          channel: 'whatsapp',
          source: 'webhook_zaia',
          text: message ? `Cliente respondeu: ${message.slice(0, 200)}` : 'Cliente respondeu.',
          data: { phone, campaign_id, recipient_id },
        });
        break;
      }

      case 'appointment.booked': {
        const {
          customer_phone, customer_name, start_time, service_name,
          campaign_id, recipient_id, value,
        } = (data || {}) as {
          customer_phone?: string; customer_name?: string; start_time?: string;
          service_name?: string; campaign_id?: string; recipient_id?: string; value?: number;
        };

        // Find or create customer
        let customerId: string | null = null;
        if (customer_phone) {
          const existing = await sqlOne<{ id: string }>(
            `SELECT id FROM customers WHERE salon_id = $1 AND phone = $2 LIMIT 1`,
            [salonId, customer_phone]
          );
          if (existing) {
            customerId = existing.id;
            await sql(
              `UPDATE customers SET status = 'active', last_contact_at = NOW(), updated_at = NOW() WHERE id = $1`,
              [customerId]
            ).catch(() => undefined);
          } else {
            const created = await sqlOne<{ id: string }>(
              `INSERT INTO customers (salon_id, name, phone, status, source)
               VALUES ($1, $2, $3, 'new', 'zaia') RETURNING id`,
              [salonId, customer_name || 'Cliente', customer_phone]
            );
            customerId = created?.id || null;
          }
        }

        if (start_time) {
          await sql(
            `INSERT INTO appointments (salon_id, customer_id, start_time, status, value, notes)
             VALUES ($1, $2, $3, 'scheduled', $4, $5)`,
            [
              salonId,
              customerId,
              start_time,
              value || 0,
              `Agendado via Zaia${service_name ? ` — ${service_name}` : ''}${campaign_id ? ' [campanha]' : ''}`,
            ]
          ).catch(() => undefined);
        }

        // Se veio de campanha: marca recipient como 'booked', incrementa booked_count, atualiza revenue
        if (campaign_id) {
          if (recipient_id) {
            await sql(
              `UPDATE campaign_recipients
                  SET status = 'booked', booked_at = NOW(),
                      responded_at = COALESCE(responded_at, NOW())
                WHERE id = $1`,
              [recipient_id]
            ).catch(() => undefined);
          } else if (customerId) {
            await sql(
              `UPDATE campaign_recipients
                  SET status = 'booked', booked_at = NOW(),
                      responded_at = COALESCE(responded_at, NOW())
                WHERE campaign_id = $1 AND customer_id = $2`,
              [campaign_id, customerId]
            ).catch(() => undefined);
          }
          await sql(
            `UPDATE campaigns
                SET booked_count = booked_count + 1,
                    estimated_revenue = estimated_revenue + COALESCE($3, 0),
                    updated_at = NOW()
              WHERE id = $1 AND salon_id = $2`,
            [campaign_id, salonId, value || 0]
          ).catch(() => undefined);

          await recordEvent({
            salonId,
            customerId,
            eventType: 'appointment.booked_via_campaign',
            channel: 'whatsapp',
            source: 'webhook_zaia',
            text: `Agendamento confirmado via campanha (cliente ${customer_name || customer_phone}).`,
            data: { campaign_id, recipient_id, start_time, service_name, value },
          });
        } else {
          await recordEvent({
            salonId,
            customerId,
            eventType: 'appointment.created',
            channel: 'whatsapp',
            source: 'webhook_zaia',
            text: `Agendamento criado via Zaia (cliente ${customer_name || customer_phone}).`,
            data: { start_time, service_name, value },
          });
        }
        break;
      }

      case 'customer.updated': {
        const { phone, status } = (data || {}) as { phone?: string; status?: string };
        if (phone && status) {
          await sql(
            `UPDATE customers SET status = $1, updated_at = NOW()
             WHERE salon_id = $2 AND phone = $3`,
            [status, salonId, phone]
          ).catch(() => undefined);
        }
        await recordEvent({
          salonId,
          eventType: 'zaia.message.received',
          source: 'webhook_zaia',
          text: `Cliente atualizada via Zaia.`,
          data: data || {},
        });
        break;
      }

      case 'campaign.response': {
        const { campaign_id } = (data || {}) as { campaign_id?: string };
        if (campaign_id) {
          await sql(
            `UPDATE campaigns
               SET responded_count = responded_count + 1, updated_at = NOW()
             WHERE id = $1 AND salon_id = $2`,
            [campaign_id, salonId]
          ).catch(() => undefined);
        }
        break;
      }

      case 'campaign.finished':
      case 'campaign.close_loop': {
        // sinal explícito de que a Zaia (ou cron) considera a campanha encerrada → roda Learning Layer
        const { campaign_id } = (data || {}) as { campaign_id?: string };
        if (campaign_id) {
          await closeExperimentForCampaign(campaign_id).catch(err =>
            console.error('[webhook zaia] close experiment failed', err)
          );
        }
        break;
      }

      default:
        console.log(`[Zaia Webhook] Unknown event: ${event}`);
    }

    // Trigger learning closure quando vier appointment.booked com campaign_id
    // (decisão: cada agendamento vindo de campanha já contribui pro aprendizado parcial,
    // mas só fechamos o experimento ao receber 'campaign.finished' OU manualmente).
    return NextResponse.json({ received: true, event });
  } catch (err) {
    console.error('[API /integrations/zaia/webhook]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'zaia',
    version: '2.0',
    accepts: [
      'conversation.started',
      'lead.captured',
      'message.received',
      'customer.replied',
      'appointment.booked',
      'customer.updated',
      'campaign.response',
      'campaign.finished',
      'campaign.close_loop',
    ],
  });
}

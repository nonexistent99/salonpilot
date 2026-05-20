/**
 * POST /api/campaigns/[id]/dispatch
 *
 * Action Engine — pega a campanha criada pelo Strategic Engine e dispara via Zaia.
 *
 * Comportamento:
 *  - lê campanha + recipients pending
 *  - para cada uma: personaliza {{nome}} e chama Zaia
 *  - atualiza campaign_recipients (sent/failed) e campaigns (sent_count, started_at, status=active)
 *  - registra eventos zaia.message.sent / zaia.message.failed (já é feito dentro de zaia-service)
 *
 * Body opcional: { limit?: number, delay_ms?: number }
 *   - limit: limita quantas envios neste batch (default 50)
 *   - delay_ms: pausa entre envios (default 250ms) para respeitar rate-limit do Zaia/WhatsApp
 */

import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';
import { sendWhatsAppMessage } from '@/services/zaia-service';
import { recordEvent } from '@/services/events';

interface CampaignRow {
  id: string;
  salon_id: string;
  name: string;
  message: string;
  status: string;
  sent_count: number;
  recipients_count: number;
  started_at: string | null;
}

interface RecipientRow {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
}

function personalize(template: string, name: string): string {
  const firstName = (name || '').split(/\s+/)[0] || name || '';
  return template
    .replaceAll('{{nome}}', firstName)
    .replaceAll('{{Nome}}', firstName)
    .replaceAll('{nome}', firstName);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const campaignId = resolvedParams.id;
    if (!campaignId) return NextResponse.json({ error: 'campaign id requerido.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(200, body.limit ?? 50));
    const delayMs = Math.max(0, Math.min(5000, body.delay_ms ?? 250));

    const campaign = await sqlOne<CampaignRow>(
      `SELECT id, salon_id, name, message, status, sent_count, recipients_count, started_at
         FROM campaigns
        WHERE id = $1 AND salon_id = $2`,
      [campaignId, auth.salonId]
    );

    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    if (!campaign.message) return NextResponse.json({ error: 'Campanha sem mensagem.' }, { status: 400 });
    if (campaign.status === 'finished' || campaign.status === 'canceled') {
      return NextResponse.json({ error: `Campanha está ${campaign.status}, não pode ser disparada.` }, { status: 400 });
    }

    const recipients = await sql<RecipientRow>(
      `SELECT cr.id, cr.customer_id,
              c.name AS customer_name, c.phone AS customer_phone
         FROM campaign_recipients cr
         JOIN customers c ON c.id = cr.customer_id
        WHERE cr.campaign_id = $1
          AND cr.status = 'pending'
          AND c.phone IS NOT NULL
        ORDER BY c.total_spent DESC NULLS LAST
        LIMIT $2`,
      [campaignId, limit]
    );

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, dispatched: 0, message: 'Sem destinatárias pendentes.' });
    }

    // Marca campanha como ativa na primeira dispatch
    if (!campaign.started_at) {
      await sql(
        `UPDATE campaigns SET status = 'active', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [campaignId]
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: Array<{ recipient_id: string; error: string }> = [];

    for (const r of recipients) {
      if (!r.customer_phone) {
        await sql(
          `UPDATE campaign_recipients SET status = 'failed', error_message = 'sem telefone' WHERE id = $1`,
          [r.id]
        );
        failed++;
        continue;
      }

      const personalizedMessage = personalize(campaign.message, r.customer_name);
      const result = await sendWhatsAppMessage({
        salonId: auth.salonId,
        customerId: r.customer_id,
        customerName: r.customer_name,
        phone: r.customer_phone,
        message: personalizedMessage,
        campaignId,
        externalId: r.id, // recipient id como correlação
        meta: { campaign_name: campaign.name },
      });

      if (result.ok) {
        await sql(
          `UPDATE campaign_recipients SET status = 'sent', sent_at = NOW(), error_message = NULL WHERE id = $1`,
          [r.id]
        );
        sent++;
      } else {
        await sql(
          `UPDATE campaign_recipients SET status = 'failed', error_message = $2 WHERE id = $1`,
          [r.id, (result.error || 'erro').slice(0, 250)]
        );
        failed++;
        errors.push({ recipient_id: r.id, error: result.error || 'erro' });
      }

      if (delayMs > 0 && recipients.indexOf(r) < recipients.length - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    // Atualiza contadores da campanha
    await sql(
      `UPDATE campaigns
         SET sent_count = sent_count + $2, updated_at = NOW()
       WHERE id = $1`,
      [campaignId, sent]
    );

    await recordEvent({
      salonId: auth.salonId,
      eventType: 'campaign.dispatched',
      source: 'user_action',
      text: `Campanha "${campaign.name}" disparada: ${sent} enviadas, ${failed} falharam.`,
      data: { campaign_id: campaignId, sent, failed },
    });

    return NextResponse.json({
      ok: true,
      campaign_id: campaignId,
      dispatched: sent,
      failed,
      total_attempted: recipients.length,
      errors: errors.slice(0, 5),
    });
  } catch (err) {
    console.error('[campaigns/dispatch]', err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro interno.',
    }, { status: 500 });
  }
}

/**
 * POST /api/intelligence/detect-inactive
 *
 * Strategic Engine — primeiro loop vivo.
 *
 * Detecta clientes sumidas, monta contexto comprimido, chama OpenAI para decidir
 * a estratégia, cria campanha + recipients + strategy_experiment (loop aberto).
 *
 * Body opcional:
 *   { days_inactive?: number, max_recipients?: number, dry_run?: boolean, salon_id?: string }
 *
 * Body é opcional para a dona logada — pega o salonId da sessão.
 * Para cron interno, passar X-Internal-Cron header + salon_id.
 */

import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';
import { buildSalonContext, compressContext } from '@/services/context-builder';
import { generateAI, parseAIJson } from '@/services/ai-service';
import { REACTIVATION_STRATEGIST_SYSTEM, buildReactivationPrompt } from '@/services/ai-prompts';
import { recordEvent } from '@/services/events';

interface InactiveCustomer {
  id: string;
  name: string;
  phone: string | null;
  last_visit_at: string | null;
  total_spent: number;
  average_ticket: number;
  visit_count: number;
  days_since_last_visit: number;
}

interface ReactivationDecision {
  strategy_name: string;
  hypothesis: string;
  audience_logic: string;
  offer_type: string;
  offer_description: string;
  message_template: string;
  tone: string;
  expected_response_rate: number;
  expected_booking_rate: number;
  expected_revenue: number;
  confidence: number;
  assumptions: string[];
  next_recommendation: string;
}

export async function POST(req: Request) {
  try {
    // Auth: dona logada OU cron interno
    let salonId: string;
    let userId: string | null = null;
    const internalHeader = req.headers.get('x-internal-cron');

    const body = await req.json().catch(() => ({}));
    const daysInactive = Math.max(7, Math.min(180, body.days_inactive ?? 30));
    const maxRecipients = Math.max(1, Math.min(500, body.max_recipients ?? 50));
    const dryRun = !!body.dry_run;

    if (internalHeader && process.env.INTERNAL_CRON_SECRET && internalHeader === process.env.INTERNAL_CRON_SECRET) {
      if (!body.salon_id) return NextResponse.json({ error: 'salon_id obrigatório para cron interno.' }, { status: 400 });
      salonId = body.salon_id;
    } else {
      const auth = await requireSalon();
      if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
      salonId = auth.salonId;
      userId = auth.user.id;
    }

    // 1) Detectar clientes sumidas
    const inactives = await sql<InactiveCustomer>(
      `SELECT id, name, phone, last_visit_at,
              COALESCE(total_spent, 0)::float8 AS total_spent,
              COALESCE(average_ticket, 0)::float8 AS average_ticket,
              COALESCE(visit_count, 0) AS visit_count,
              EXTRACT(DAY FROM NOW() - last_visit_at)::int AS days_since_last_visit
         FROM customers
        WHERE salon_id = $1
          AND status IN ('active', 'at_risk', 'inactive')
          AND last_visit_at IS NOT NULL
          AND last_visit_at < NOW() - ($2 || ' days')::interval
          AND phone IS NOT NULL
        ORDER BY total_spent DESC, last_visit_at ASC
        LIMIT $3`,
      [salonId, String(daysInactive), maxRecipients]
    );

    await recordEvent({
      salonId,
      eventType: 'intelligence.inactive_detected',
      source: internalHeader ? 'cron' : 'user_action',
      text: `Detectadas ${inactives.length} clientes sumidas há ${daysInactive}+ dias.`,
      data: { days_inactive: daysInactive, count: inactives.length, max_recipients: maxRecipients },
    });

    if (inactives.length === 0) {
      return NextResponse.json({
        ok: true,
        detected: 0,
        message: 'Nenhuma cliente sumida encontrada com esse critério.',
      });
    }

    // 2) Montar contexto comprimido + resumo do grupo
    const ctx = await buildSalonContext(salonId);
    const compressed = compressContext(ctx);

    const buckets = {
      vip_recovery: 0,        // alto ticket + ≥3 visitas
      regular: 0,             // 2-3 visitas
      one_timer: 0,           // só 1 visita
    };
    let avgTicketGroup = 0;
    let avgDays = 0;
    for (const c of inactives) {
      avgTicketGroup += c.average_ticket;
      avgDays += c.days_since_last_visit;
      if (c.visit_count >= 3 && c.total_spent >= 200) buckets.vip_recovery++;
      else if (c.visit_count >= 2) buckets.regular++;
      else buckets.one_timer++;
    }
    avgTicketGroup = avgTicketGroup / inactives.length;
    avgDays = avgDays / inactives.length;

    const groupSummary = [
      `Total no grupo: ${inactives.length} clientes.`,
      `Composição: ${buckets.vip_recovery} VIP (≥3 visitas, gasto ≥R$200), ${buckets.regular} regulares (2-3 visitas), ${buckets.one_timer} de visita única.`,
      `Ticket médio do grupo: R$${avgTicketGroup.toFixed(0)}.`,
      `Tempo médio de sumiço: ${Math.round(avgDays)} dias.`,
      `Amostra: ${inactives.slice(0, 5).map(c => `${c.name} (${c.visit_count}vis, R$${c.average_ticket.toFixed(0)}, ${c.days_since_last_visit}d)`).join('; ')}.`,
    ].join('\n');

    // 3) Chamar OpenAI para decidir estratégia
    const aiRes = await generateAI({
      systemPrompt: REACTIVATION_STRATEGIST_SYSTEM,
      userPrompt: buildReactivationPrompt({
        compressedContext: compressed,
        inactiveCustomersSummary: groupSummary,
        daysInactiveThreshold: daysInactive,
      }),
      tier: 'strategic',
      jsonSchema: { type: 'object' },
      temperature: 0.5,
      maxTokens: 1200,
    });

    let decision: ReactivationDecision;
    try {
      decision = parseAIJson<ReactivationDecision>(aiRes);
    } catch {
      return NextResponse.json({
        ok: false,
        error: 'A IA respondeu fora do formato esperado.',
        raw: aiRes.content.slice(0, 500),
        provider: aiRes.provider,
      }, { status: 502 });
    }

    // 4) Registrar uso da IA
    if (aiRes.tokens) {
      await sql(
        `INSERT INTO ai_usage (salon_id, provider, model, prompt_tokens, completion_tokens, feature)
         VALUES ($1, $2, $3, $4, $5, 'reactivation_strategist')`,
        [salonId, aiRes.provider, aiRes.model, aiRes.tokens.prompt, aiRes.tokens.completion]
      ).catch(() => undefined);
    }

    // Dry run: devolve decisão sem persistir campanha
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        detected: inactives.length,
        decision,
        provider: aiRes.provider,
        model: aiRes.model,
      });
    }

    // 5) Criar a campanha (draft)
    const campaign = await sqlOne<{ id: string }>(
      `INSERT INTO campaigns
         (salon_id, name, objective, channel, status, audience_filter_json,
          offer_type, offer_description, message, generated_by_ai, recipients_count, estimated_revenue, created_by)
       VALUES ($1, $2, 'reativacao', 'whatsapp', 'draft', $3,
               $4, $5, $6, TRUE, $7, $8, $9)
       RETURNING id`,
      [
        salonId,
        decision.strategy_name?.slice(0, 120) || 'Reativação inteligente',
        JSON.stringify({
          days_inactive: daysInactive,
          audience_logic: decision.audience_logic,
          buckets,
          group_avg_ticket: avgTicketGroup,
        }),
        decision.offer_type?.slice(0, 64) || 'relacionamento',
        decision.offer_description?.slice(0, 300) || null,
        decision.message_template || '',
        inactives.length,
        decision.expected_revenue || 0,
        userId,
      ]
    );

    if (!campaign) {
      return NextResponse.json({ error: 'Falha ao criar campanha.' }, { status: 500 });
    }

    // 6) Criar recipients (pending)
    if (inactives.length) {
      const values: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      for (const c of inactives) {
        values.push(`($${i++}, $${i++}, 'pending')`);
        params.push(campaign.id, c.id);
      }
      await sql(
        `INSERT INTO campaign_recipients (campaign_id, customer_id, status) VALUES ${values.join(',')}`,
        params
      );
    }

    // 7) Criar strategy_experiment (loop aberto, será fechado quando os resultados voltarem)
    const experiment = await sqlOne<{ id: string }>(
      `INSERT INTO strategy_experiments
         (salon_id, hypothesis, action_taken, audience_used, channel_used,
          message_used, offer_used, expected_result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        salonId,
        decision.hypothesis || 'sem hipótese',
        decision.strategy_name || 'reativação',
        JSON.stringify({
          count: inactives.length,
          buckets,
          avg_ticket: avgTicketGroup,
          avg_days_inactive: avgDays,
          customer_ids: inactives.map(c => c.id),
        }),
        'whatsapp',
        decision.message_template,
        decision.offer_description,
        JSON.stringify({
          response_rate: decision.expected_response_rate,
          booking_rate: decision.expected_booking_rate,
          revenue: decision.expected_revenue,
          confidence: decision.confidence,
          assumptions: decision.assumptions,
          next_if_fails: decision.next_recommendation,
        }),
      ]
    );

    // Linkar experiment_id na campanha via audience_filter (já tem o slot)
    if (experiment) {
      await sql(
        `UPDATE campaigns
            SET audience_filter_json = audience_filter_json || $1::jsonb
          WHERE id = $2`,
        [JSON.stringify({ strategy_experiment_id: experiment.id }), campaign.id]
      ).catch(() => undefined);
    }

    // 8) Eventos
    await recordEvent({
      salonId,
      eventType: 'intelligence.campaign_planned',
      source: 'ai_decision',
      text: `IA planejou campanha "${decision.strategy_name}" para ${inactives.length} clientes (confiança ${decision.confidence}).`,
      data: { campaign_id: campaign.id, experiment_id: experiment?.id, decision },
    });

    await recordEvent({
      salonId,
      eventType: 'campaign.created',
      source: 'ai_decision',
      text: `Campanha "${decision.strategy_name}" criada com ${inactives.length} destinatárias.`,
      data: { campaign_id: campaign.id, experiment_id: experiment?.id },
    });

    return NextResponse.json({
      ok: true,
      detected: inactives.length,
      campaign_id: campaign.id,
      experiment_id: experiment?.id,
      decision,
      provider: aiRes.provider,
      model: aiRes.model,
      next: `POST /api/campaigns/${campaign.id}/dispatch para disparar via Zaia.`,
    });
  } catch (err) {
    console.error('[detect-inactive]', err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro interno.',
    }, { status: 500 });
  }
}

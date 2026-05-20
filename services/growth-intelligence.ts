/**
 * Growth Intelligence KPI Engine
 * Transforma dados do salão em diagnóstico estratégico, KPIs e aprendizado contínuo.
 */

import { sql, sqlOne } from '@/lib/db/neon';
import { generateAI, parseAIJson } from './ai-service';

// ─── Types ────────────────────────────────────────────────

export type EventType =
  | 'message_received' | 'message_sent' | 'asked_price' | 'asked_schedule'
  | 'appointment_booked' | 'appointment_canceled' | 'customer_no_response'
  | 'customer_purchased' | 'customer_returned' | 'customer_churned'
  | 'campaign_sent' | 'campaign_responded' | 'campaign_booked'
  | 'service_sold' | 'no_show' | 'mission_completed' | 'owner_feedback';

export interface BusinessEvent {
  salonId: string;
  customerId?: string;
  eventType: EventType;
  channel?: string;
  source?: string;
  eventText?: string;
  structuredData?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface StrategicDecision {
  current_diagnosis: string;
  main_bottleneck: string;
  best_opportunity: string;
  recommended_strategy: string;
  action_plan: string[];
  campaign_to_create: Record<string, unknown>;
  content_to_create: Record<string, unknown>;
  metrics_to_watch: string[];
  learning_goal: string;
}

export interface GrowthHealthBreakdown {
  acquisition: number;
  retention: number;
  ticket_upsell: number;
  agenda: number;
  attendance: number;
  digital_presence: number;
  execution: number;
  total: number;
  main_bottleneck: string;
  best_opportunity: string;
  recommended_action: string;
}

// ─── 1. Business Event Tracker ────────────────────────────

export async function trackEvent(event: BusinessEvent): Promise<void> {
  await sql(
    `INSERT INTO business_events
      (salon_id, customer_id, event_type, channel, source, event_text, structured_data_json, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      event.salonId,
      event.customerId ?? null,
      event.eventType,
      event.channel ?? null,
      event.source ?? null,
      event.eventText ?? null,
      JSON.stringify(event.structuredData ?? {}),
      event.occurredAt ?? new Date(),
    ]
  );
}

// ─── 2. Intelligence Notes ────────────────────────────────

export async function createIntelligenceNote(params: {
  salonId: string;
  noteType: string;
  title: string;
  content: string;
  source?: string;
  confidenceScore?: number;
  relatedCustomerId?: string;
  relatedCampaignId?: string;
}): Promise<void> {
  await sql(
    `INSERT INTO salon_intelligence_notes
      (salon_id, note_type, title, content, source, confidence_score, related_customer_id, related_campaign_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      params.salonId, params.noteType, params.title, params.content,
      params.source ?? 'system', params.confidenceScore ?? 0.5,
      params.relatedCustomerId ?? null, params.relatedCampaignId ?? null,
    ]
  );
}

export async function getIntelligenceNotes(salonId: string, limit = 20) {
  return sql(
    `SELECT * FROM salon_intelligence_notes WHERE salon_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [salonId, limit]
  );
}

// ─── 3. Strategic Profile ─────────────────────────────────

export async function getStrategyProfile(salonId: string) {
  return sqlOne(`SELECT * FROM salon_strategy_profile WHERE salon_id=$1`, [salonId]);
}

export async function upsertStrategyProfile(salonId: string, profile: Record<string, unknown>): Promise<void> {
  const fields = Object.keys(profile).filter(k => k !== 'salon_id');
  const vals = fields.map(k => profile[k]);
  const setClauses = fields.map((k, i) => `${k}=$${i + 2}`).join(', ');

  await sql(
    `INSERT INTO salon_strategy_profile (salon_id, ${fields.join(', ')}, updated_at)
     VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')}, NOW())
     ON CONFLICT (salon_id) DO UPDATE SET ${setClauses}, updated_at=NOW()`,
    [salonId, ...vals]
  );
}

// ─── 4. KPI Snapshots ─────────────────────────────────────

export async function computeAndSaveKpiSnapshot(salonId: string, periodStart: Date, periodEnd: Date) {
  const start = periodStart.toISOString().split('T')[0];
  const end = periodEnd.toISOString().split('T')[0];

  // Collect raw data
  const [customerStats, appointmentStats, campaignStats] = await Promise.all([
    sqlOne<Record<string, string>>(
      `SELECT
        COUNT(*) FILTER (WHERE created_at::date BETWEEN $2 AND $3) as new_count,
        COUNT(*) FILTER (WHERE status IN ('inactive','lost')) as inactive_count,
        COUNT(*) FILTER (WHERE last_visit_at::date BETWEEN $2 AND $3 AND created_at::date < $2) as returning_count,
        ROUND(AVG(average_ticket) FILTER (WHERE average_ticket > 0), 2) as avg_ticket
       FROM customers WHERE salon_id=$1`,
      [salonId, start, end]
    ),
    sqlOne<Record<string, string>>(
      `SELECT
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status='no_show') as no_shows,
        COALESCE(SUM(value) FILTER (WHERE status='attended'), 0) as revenue
       FROM appointments WHERE salon_id=$1 AND DATE(start_time) BETWEEN $2 AND $3`,
      [salonId, start, end]
    ),
    sqlOne<Record<string, string>>(
      `SELECT
        COUNT(*) as sent,
        COUNT(*) FILTER (WHERE status IN ('responded','booked')) as responded,
        COUNT(*) FILTER (WHERE status='booked') as booked
       FROM campaigns WHERE salon_id=$1 AND created_at::date BETWEEN $2 AND $3`,
      [salonId, start, end]
    ),
  ]);

  const totalAppt = parseInt(appointmentStats?.total_appointments ?? '0');
  const noShows = parseInt(appointmentStats?.no_shows ?? '0');
  const revenue = parseFloat(appointmentStats?.revenue ?? '0');
  const newCustomers = parseInt(customerStats?.new_count ?? '0');
  const returningCustomers = parseInt(customerStats?.returning_count ?? '0');
  const inactiveCustomers = parseInt(customerStats?.inactive_count ?? '0');
  const avgTicket = parseFloat(customerStats?.avg_ticket ?? '0');
  const campaignSent = parseInt(campaignStats?.sent ?? '0');
  const campaignResponded = parseInt(campaignStats?.responded ?? '0');
  const campaignBooked = parseInt(campaignStats?.booked ?? '0');

  const noShowRate = totalAppt > 0 ? (noShows / totalAppt) * 100 : 0;
  const campaignResponseRate = campaignSent > 0 ? (campaignResponded / campaignSent) * 100 : 0;
  const campaignBookingRate = campaignSent > 0 ? (campaignBooked / campaignSent) * 100 : 0;

  // Growth Health Score
  const health = computeGrowthHealthScore({
    newCustomers, returningCustomers, inactiveCustomers,
    noShowRate, avgTicket, campaignResponseRate,
    totalAppointments: totalAppt,
  });

  await sql(
    `INSERT INTO salon_kpi_snapshots
      (salon_id, period_start, period_end, revenue_estimated, new_customers_count,
       returning_customers_count, inactive_customers_count, average_ticket,
       appointment_count, no_show_rate, campaign_response_rate, campaign_booking_rate,
       retention_rate, growth_health_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT DO NOTHING`,
    [
      salonId, start, end, revenue, newCustomers, returningCustomers, inactiveCustomers,
      avgTicket, totalAppt, noShowRate.toFixed(2), campaignResponseRate.toFixed(2),
      campaignBookingRate.toFixed(2),
      totalAppt > 0 ? ((returningCustomers / totalAppt) * 100).toFixed(2) : '0',
      health.total.toFixed(2),
    ]
  );

  return health;
}

// ─── 6. Growth Health Score ───────────────────────────────

export function computeGrowthHealthScore(data: {
  newCustomers: number;
  returningCustomers: number;
  inactiveCustomers: number;
  noShowRate: number;
  avgTicket: number;
  campaignResponseRate: number;
  totalAppointments: number;
}): GrowthHealthBreakdown {
  const acquisition = Math.min(20, (data.newCustomers / Math.max(data.totalAppointments, 1)) * 100);
  const retention = Math.min(20, (data.returningCustomers / Math.max(data.totalAppointments, 1)) * 100);
  const ticketUpsell = Math.min(15, data.avgTicket > 150 ? 15 : data.avgTicket > 80 ? 10 : 5);
  const agenda = Math.min(15, data.totalAppointments > 0 ? Math.max(0, 15 - data.noShowRate * 0.5) : 5);
  const attendance = Math.min(10, data.campaignResponseRate > 30 ? 10 : data.campaignResponseRate > 15 ? 7 : 3);
  const digitalPresence = Math.min(10, data.campaignResponseRate > 0 ? 7 : 3);
  const execution = Math.min(10, data.totalAppointments > 5 ? 8 : 4);

  const total = acquisition + retention + ticketUpsell + agenda + attendance + digitalPresence + execution;

  const scores: Record<string, number> = { acquisition, retention, ticketUpsell, agenda, attendance, digitalPresence, execution };
  const sortedAsc = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const bottleneckKey = sortedAsc[0][0];
  const opportunityKey = sortedAsc[sortedAsc.length - 1][0];

  const bottleneckLabels: Record<string, string> = {
    acquisition: 'Aquisição de novas clientes',
    retention: 'Retenção de clientes ativas',
    ticketUpsell: 'Ticket médio / upsell',
    agenda: 'Ocupação da agenda',
    attendance: 'Resposta e engajamento',
    digitalPresence: 'Presença digital',
    execution: 'Execução das ações',
  };

  const actionMap: Record<string, string> = {
    acquisition: 'Crie uma campanha de captação com oferta de primeiro atendimento.',
    retention: 'Ative programa de retorno: contato automático 25 dias após atendimento.',
    ticketUpsell: 'Ofereça combos e serviços adicionais na confirmação do agendamento.',
    agenda: 'Reduza no-shows com confirmação automática 24h antes.',
    attendance: 'Melhore a taxa de resposta com mensagens mais personalizadas.',
    digitalPresence: 'Poste conteúdo de transformação no Instagram 3x por semana.',
    execution: 'Complete as missões diárias para manter o ritmo de crescimento.',
  };

  return {
    acquisition: Math.round(acquisition * 10) / 10,
    retention: Math.round(retention * 10) / 10,
    ticket_upsell: Math.round(ticketUpsell * 10) / 10,
    agenda: Math.round(agenda * 10) / 10,
    attendance: Math.round(attendance * 10) / 10,
    digital_presence: Math.round(digitalPresence * 10) / 10,
    execution: Math.round(execution * 10) / 10,
    total: Math.round(total * 10) / 10,
    main_bottleneck: bottleneckLabels[bottleneckKey] ?? bottleneckKey,
    best_opportunity: bottleneckLabels[opportunityKey] ?? opportunityKey,
    recommended_action: actionMap[bottleneckKey] ?? 'Analise os dados e defina prioridade.',
  };
}

// ─── 5. KPI Insights (AI) ────────────────────────────────

export async function generateKpiInsights(salonId: string, kpiData: Record<string, unknown>): Promise<void> {
  const prompt = `Você é um analista estratégico de salões de beleza. Analise os KPIs abaixo e gere insights estratégicos.

KPIs do salão:
${JSON.stringify(kpiData, null, 2)}

Retorne um JSON com array de insights:
[
  {
    "kpi_name": "nome do KPI",
    "raw_value": "valor bruto",
    "interpretation": "interpretação estratégica clara e específica",
    "risk_level": "low|medium|high|critical",
    "opportunity_level": "low|medium|high",
    "recommended_action": "ação concreta e específica baseada no dado"
  }
]`;

  try {
    const resp = await generateAI({
      systemPrompt: 'Você é especialista em crescimento de salões de beleza. Sempre baseie recomendações em dados reais.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 1200,
    });

    const insights = parseAIJson<Array<Record<string, string>>>(resp);

    for (const insight of insights) {
      await sql(
        `INSERT INTO growth_kpi_insights (salon_id, kpi_name, raw_value, interpretation, risk_level, opportunity_level, recommended_action)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [salonId, insight.kpi_name, insight.raw_value, insight.interpretation,
          insight.risk_level ?? 'low', insight.opportunity_level ?? 'low', insight.recommended_action]
      );
    }
  } catch (e) {
    console.error('[GrowthIntelligence] generateKpiInsights error:', e);
  }
}

// ─── 7. Strategic Decision Engine ────────────────────────

export async function generateStrategicDecision(salonId: string): Promise<StrategicDecision> {
  const [kpis, profile, notes, customers, salon] = await Promise.all([
    sql(`SELECT * FROM salon_kpi_snapshots WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 3`, [salonId]),
    sqlOne(`SELECT * FROM salon_strategy_profile WHERE salon_id=$1`, [salonId]),
    sql(`SELECT * FROM salon_intelligence_notes WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 10`, [salonId]),
    sqlOne<Record<string, string>>(
      `SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE status='inactive') as inactive,
        COUNT(*) FILTER (WHERE status='vip') as vip,
        ROUND(AVG(average_ticket) FILTER (WHERE average_ticket>0),2) as avg_ticket
       FROM customers WHERE salon_id=$1`, [salonId]
    ),
    sqlOne(`SELECT name, niche, goal, city FROM salons WHERE id=$1`, [salonId]),
  ]);

  const context = { salon, kpis, profile, notes: notes.slice(0, 5), customerSummary: customers };

  const resp = await generateAI({
    systemPrompt: `Você é o Growth Intelligence Engine do SalonPilot. Gere decisões estratégicas personalizadas para salões de beleza brasileiros. Baseie cada recomendação em dados concretos. Nunca gere recomendações genéricas.`,
    userPrompt: `Contexto do salão:\n${JSON.stringify(context, null, 2)}\n\nGere uma decisão estratégica completa em JSON com os campos: current_diagnosis, main_bottleneck, best_opportunity, recommended_strategy, action_plan (array de strings), campaign_to_create (objeto), content_to_create (objeto), metrics_to_watch (array), learning_goal.`,
    temperature: 0.5,
    maxTokens: 1500,
  });

  try {
    return parseAIJson<StrategicDecision>(resp);
  } catch {
    return {
      current_diagnosis: 'Dados insuficientes para diagnóstico completo. Continue registrando eventos.',
      main_bottleneck: 'Volume de dados ainda baixo',
      best_opportunity: 'Iniciar rastreamento de eventos para gerar inteligência',
      recommended_strategy: 'Completar onboarding e registrar primeiros atendimentos',
      action_plan: ['Cadastrar clientes existentes', 'Registrar serviços realizados', 'Ativar integração WhatsApp'],
      campaign_to_create: {},
      content_to_create: {},
      metrics_to_watch: ['retention_rate', 'average_ticket', 'new_customers'],
      learning_goal: 'Identificar padrão de comportamento das clientes nos primeiros 30 dias',
    };
  }
}

// ─── 8. Strategy Experiments ─────────────────────────────

export async function createExperiment(params: {
  salonId: string;
  hypothesis: string;
  actionTaken: string;
  audienceUsed?: string;
  channelUsed?: string;
  messageUsed?: string;
  offerUsed?: string;
  expectedResult: string;
}) {
  const rows = await sql<{ id: string }>(
    `INSERT INTO strategy_experiments
      (salon_id, hypothesis, action_taken, audience_used, channel_used, message_used, offer_used, expected_result)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [params.salonId, params.hypothesis, params.actionTaken, params.audienceUsed ?? null,
      params.channelUsed ?? null, params.messageUsed ?? null, params.offerUsed ?? null, params.expectedResult]
  );
  return rows[0];
}

// ─── 9. Learning Loop ─────────────────────────────────────

export async function processStrategyLearning(experimentId: string, actualResult: string): Promise<void> {
  const exp = await sqlOne<Record<string, string>>(
    `SELECT * FROM strategy_experiments WHERE id=$1`, [experimentId]
  );
  if (!exp) return;

  const resp = await generateAI({
    systemPrompt: 'Você é analista de growth para salões de beleza. Analise experimentos e gere aprendizados acionáveis.',
    userPrompt: `Experimento:
Hipótese: ${exp.hypothesis}
Ação tomada: ${exp.action_taken}
Canal: ${exp.channel_used}
Resultado esperado: ${exp.expected_result}
Resultado real: ${actualResult}

Gere um JSON com:
{
  "success_score": 0.0 a 1.0,
  "ai_learning_summary": "resumo do aprendizado",
  "next_recommendation": "próxima ação recomendada baseada no aprendizado"
}`,
    temperature: 0.3,
    maxTokens: 600,
  });

  let learning: Record<string, unknown> = {};
  try { learning = parseAIJson(resp); } catch { learning = { success_score: 0.5, ai_learning_summary: actualResult, next_recommendation: 'Repetir com ajuste de mensagem.' }; }

  await sql(
    `UPDATE strategy_experiments SET actual_result=$2, success_score=$3, ai_learning_summary=$4, next_recommendation=$5, completed_at=NOW() WHERE id=$1`,
    [experimentId, actualResult, learning.success_score, learning.ai_learning_summary, learning.next_recommendation]
  );

  // Create intelligence note from learning
  await createIntelligenceNote({
    salonId: exp.salon_id,
    noteType: 'campaign_learning',
    title: `Aprendizado: ${exp.action_taken?.slice(0, 60)}`,
    content: String(learning.ai_learning_summary ?? ''),
    source: 'learning_loop',
    confidenceScore: parseFloat(String(learning.success_score ?? 0.5)),
  });
}

// ─── 10. Customer Intelligence ────────────────────────────

export async function analyzeCustomer(salonId: string, customerId: string): Promise<void> {
  const [customer, appointments, events] = await Promise.all([
    sqlOne(`SELECT * FROM customers WHERE id=$1 AND salon_id=$2`, [customerId, salonId]),
    sql(`SELECT s.name as service_name, a.status, a.start_time, a.value FROM appointments a LEFT JOIN services s ON s.id=a.service_id WHERE a.customer_id=$1 ORDER BY a.start_time DESC LIMIT 10`, [customerId]),
    sql(`SELECT event_type, channel, occurred_at FROM business_events WHERE customer_id=$1 ORDER BY occurred_at DESC LIMIT 20`, [customerId]),
  ]);

  if (!customer) return;

  const resp = await generateAI({
    systemPrompt: 'Você analisa clientes de salões de beleza para gerar perfil estratégico individual.',
    userPrompt: `Cliente: ${JSON.stringify(customer)}
Histórico de atendimentos: ${JSON.stringify(appointments)}
Eventos: ${JSON.stringify(events)}

Retorne JSON:
{
  "value_score": 0-100,
  "retention_risk_score": 0-100,
  "next_best_action": "ação específica para esta cliente",
  "ai_summary": "resumo estratégico desta cliente em 2 frases",
  "preferred_channel": "whatsapp|instagram|presencial",
  "likely_interest": "serviços que provavelmente interessam"
}`,
    temperature: 0.3,
    maxTokens: 500,
  });

  try {
    const analysis = parseAIJson<Record<string, unknown>>(resp);
    await sql(
      `UPDATE customers SET value_score=$2, retention_risk_score=$3, next_best_action=$4, ai_summary=$5, preferred_channel=$6, likely_interest=$7, last_ai_analysis_at=NOW() WHERE id=$1`,
      [customerId, analysis.value_score, analysis.retention_risk_score, analysis.next_best_action, analysis.ai_summary, analysis.preferred_channel, analysis.likely_interest]
    );
  } catch (e) {
    console.error('[GrowthIntelligence] analyzeCustomer error:', e);
  }
}

// ─── 11. AI Reports ───────────────────────────────────────

export async function generateAIReport(salonId: string, reportType: 'daily' | 'weekly' | 'monthly'): Promise<void> {
  const days = reportType === 'daily' ? 1 : reportType === 'weekly' ? 7 : 30;
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - days * 86400000);

  const health = await computeAndSaveKpiSnapshot(salonId, periodStart, periodEnd);
  const kpis = await sql(`SELECT * FROM salon_kpi_snapshots WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 1`, [salonId]);
  const notes = await sql(`SELECT * FROM salon_intelligence_notes WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 5`, [salonId]);

  const resp = await generateAI({
    systemPrompt: 'Você é analista de crescimento de salões. Gere relatórios estratégicos baseados em dados reais.',
    userPrompt: `Relatório ${reportType} do salão.
KPIs: ${JSON.stringify(kpis[0] ?? {})}
Health Score: ${JSON.stringify(health)}
Notas de inteligência: ${JSON.stringify(notes.slice(0, 3))}

Gere JSON:
{
  "summary": "resumo executivo",
  "interpretation": "interpretação dos dados",
  "what_worked": "o que funcionou",
  "what_didnt_work": "o que não funcionou",
  "main_bottleneck": "principal gargalo",
  "best_opportunity": "melhor oportunidade",
  "recommended_actions": ["ação 1", "ação 2"],
  "suggested_campaigns": [{"name": "", "objective": "", "audience": ""}],
  "learnings": "aprendizados do período"
}`,
    temperature: 0.4,
    maxTokens: 1200,
  });

  let parsed: Record<string, unknown> = {};
  try { parsed = parseAIJson(resp); } catch { parsed = { summary: resp.content }; }

  const start = periodStart.toISOString().split('T')[0];
  const end = periodEnd.toISOString().split('T')[0];

  await sql(
    `INSERT INTO ai_reports (salon_id, report_type, period_start, period_end, summary, main_numbers, interpretation, what_worked, what_didnt_work, main_bottleneck, best_opportunity, recommended_actions, suggested_campaigns, learnings, raw_ai_response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      salonId, reportType, start, end,
      parsed.summary, JSON.stringify(kpis[0] ?? {}), parsed.interpretation,
      parsed.what_worked, parsed.what_didnt_work, parsed.main_bottleneck,
      parsed.best_opportunity,
      JSON.stringify(parsed.recommended_actions ?? []),
      JSON.stringify(parsed.suggested_campaigns ?? []),
      parsed.learnings,
      JSON.stringify(parsed),
    ]
  );
}

// ─── 12. Dashboard Intelligence Data ─────────────────────

export async function getDashboardIntelligence(salonId: string) {
  const [latestKpi, latestInsights, latestReport, topNotes, pendingExperiments] = await Promise.all([
    sqlOne(`SELECT * FROM salon_kpi_snapshots WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 1`, [salonId]),
    sql(`SELECT * FROM growth_kpi_insights WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 5`, [salonId]),
    sqlOne(`SELECT * FROM ai_reports WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 1`, [salonId]),
    sql(`SELECT * FROM salon_intelligence_notes WHERE salon_id=$1 ORDER BY confidence_score DESC, created_at DESC LIMIT 3`, [salonId]),
    sql(`SELECT * FROM strategy_experiments WHERE salon_id=$1 AND completed_at IS NULL ORDER BY created_at DESC LIMIT 3`, [salonId]),
  ]);

  return {
    kpi_snapshot: latestKpi,
    kpi_insights: latestInsights,
    latest_report: latestReport,
    intelligence_notes: topNotes,
    pending_experiments: pendingExperiments,
  };
}

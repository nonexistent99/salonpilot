/**
 * SalonPilot — Context Builder (Memory Layer)
 *
 * Constrói o contexto COMPRIMIDO que vai pra OpenAI antes de qualquer decisão.
 *
 * Princípio: a IA NUNCA recebe histórico bruto. Recebe:
 *   - perfil estratégico do salão
 *   - últimos N aprendizados (memória)
 *   - KPI snapshot mais recente
 *   - top experimentos vencedores
 *   - serviços (resumo)
 *
 * Tudo isso vira um bloco de texto curto e estruturado.
 */

import { sql, sqlOne } from '@/lib/db/neon';

export interface SalonContext {
  salon: {
    id: string;
    name: string;
    niche: string | null;
    goal: string | null;
    city: string | null;
    instagram: string | null;
  };
  profile: SalonStrategyProfile | null;
  recentLearnings: IntelligenceNote[];
  topExperiments: StrategyExperiment[];
  latestKpi: KpiSnapshot | null;
  services: ServiceBrief[];
  counts: {
    total_customers: number;
    active: number;
    inactive: number;
    vip: number;
    new: number;
    hot: number;
    free_slots_today: number;
    appointments_today: number;
    active_campaigns: number;
  };
}

interface SalonStrategyProfile {
  business_type: string | null;
  maturity_stage: string | null;
  main_goal: string | null;
  current_main_bottleneck: string | null;
  strongest_channel: string | null;
  weakest_channel: string | null;
  strongest_service: string | null;
  most_profitable_service: string | null;
  best_customer_segment: string | null;
  average_ticket_level: string | null;
  retention_level: string | null;
  acquisition_level: string | null;
  digital_activity_level: string | null;
  sales_process_quality: string | null;
  recommended_positioning: string | null;
  communication_tone: string | null;
  strategic_summary: string | null;
}

interface IntelligenceNote {
  id: string;
  note_type: string | null;
  title: string | null;
  content: string | null;
  confidence_score: number | null;
  created_at: string;
}

interface StrategyExperiment {
  id: string;
  hypothesis: string | null;
  action_taken: string | null;
  channel_used: string | null;
  success_score: number | null;
  ai_learning_summary: string | null;
  next_recommendation: string | null;
  completed_at: string | null;
}

interface KpiSnapshot {
  period_start: string;
  period_end: string;
  revenue_estimated: number;
  retention_rate: number | null;
  recurrence_rate: number | null;
  upsell_rate: number | null;
  customer_growth_rate: number | null;
  campaign_response_rate: number | null;
  campaign_booking_rate: number | null;
  no_show_rate: number | null;
  digital_activity_score: number | null;
  sales_opportunity_score: number | null;
  execution_score: number | null;
  strategy_fit_score: number | null;
  growth_health_score: number | null;
}

interface ServiceBrief {
  id: string;
  name: string;
  category: string | null;
  price: number;
}

export async function buildSalonContext(salonId: string): Promise<SalonContext> {
  const [
    salon,
    profile,
    learnings,
    experiments,
    kpi,
    services,
    counts,
    todayInfo,
    activeCampaigns,
  ] = await Promise.all([
    sqlOne<SalonContext['salon']>(
      `SELECT id, name, niche, goal, city, instagram FROM salons WHERE id = $1`,
      [salonId]
    ),
    sqlOne<SalonStrategyProfile>(
      `SELECT business_type, maturity_stage, main_goal, current_main_bottleneck,
              strongest_channel, weakest_channel, strongest_service, most_profitable_service,
              best_customer_segment, average_ticket_level, retention_level, acquisition_level,
              digital_activity_level, sales_process_quality, recommended_positioning,
              communication_tone, strategic_summary
         FROM salon_strategy_profile WHERE salon_id = $1`,
      [salonId]
    ),
    sql<IntelligenceNote>(
      `SELECT id, note_type, title, content, confidence_score, created_at
         FROM salon_intelligence_notes
        WHERE salon_id = $1
        ORDER BY created_at DESC
        LIMIT 8`,
      [salonId]
    ),
    sql<StrategyExperiment>(
      `SELECT id, hypothesis, action_taken, channel_used, success_score,
              ai_learning_summary, next_recommendation, completed_at
         FROM strategy_experiments
        WHERE salon_id = $1 AND completed_at IS NOT NULL
        ORDER BY success_score DESC NULLS LAST, completed_at DESC
        LIMIT 5`,
      [salonId]
    ),
    sqlOne<KpiSnapshot>(
      `SELECT period_start, period_end, revenue_estimated, retention_rate, recurrence_rate,
              upsell_rate, customer_growth_rate, campaign_response_rate, campaign_booking_rate,
              no_show_rate, digital_activity_score, sales_opportunity_score, execution_score,
              strategy_fit_score, growth_health_score
         FROM salon_kpi_snapshots
        WHERE salon_id = $1
        ORDER BY period_end DESC
        LIMIT 1`,
      [salonId]
    ),
    sql<ServiceBrief>(
      `SELECT id, name, category, price FROM services
        WHERE salon_id = $1 AND active = TRUE
        ORDER BY price DESC
        LIMIT 12`,
      [salonId]
    ),
    sqlOne<{
      total_customers: string;
      active: string;
      inactive: string;
      vip: string;
      new: string;
      hot: string;
    }>(
      `SELECT
         COUNT(*) AS total_customers,
         COUNT(*) FILTER (WHERE status = 'active') AS active,
         COUNT(*) FILTER (WHERE status IN ('inactive','lost')) AS inactive,
         COUNT(*) FILTER (WHERE status = 'vip') AS vip,
         COUNT(*) FILTER (WHERE status = 'new') AS new,
         COUNT(*) FILTER (WHERE status = 'hot') AS hot
        FROM customers WHERE salon_id = $1`,
      [salonId]
    ),
    sqlOne<{ appointments_today: string; free_slots: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed','attended')) AS appointments_today,
         GREATEST(0, 8 - COUNT(*) FILTER (WHERE status IN ('scheduled','confirmed','attended'))) AS free_slots
        FROM appointments
        WHERE salon_id = $1 AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE`,
      [salonId]
    ),
    sqlOne<{ n: string }>(
      `SELECT COUNT(*)::int AS n FROM campaigns WHERE salon_id = $1 AND status = 'active'`,
      [salonId]
    ),
  ]);

  if (!salon) {
    throw new Error(`Salão ${salonId} não encontrado`);
  }

  return {
    salon,
    profile,
    recentLearnings: learnings,
    topExperiments: experiments,
    latestKpi: kpi,
    services,
    counts: {
      total_customers: parseInt(counts?.total_customers || '0', 10),
      active: parseInt(counts?.active || '0', 10),
      inactive: parseInt(counts?.inactive || '0', 10),
      vip: parseInt(counts?.vip || '0', 10),
      new: parseInt(counts?.new || '0', 10),
      hot: parseInt(counts?.hot || '0', 10),
      free_slots_today: parseInt(todayInfo?.free_slots || '0', 10),
      appointments_today: parseInt(todayInfo?.appointments_today || '0', 10),
      active_campaigns: parseInt(activeCampaigns?.n || '0', 10),
    },
  };
}

/**
 * Compacta o contexto em texto curto, otimizado para tokens.
 * Esse é o bloco que vai pra OpenAI antes da pergunta específica.
 */
export function compressContext(ctx: SalonContext): string {
  const lines: string[] = [];

  lines.push(`SALÃO: ${ctx.salon.name}${ctx.salon.city ? ` (${ctx.salon.city})` : ''}`);
  if (ctx.salon.niche) lines.push(`Nicho: ${ctx.salon.niche}`);
  if (ctx.salon.goal) lines.push(`Meta principal: ${ctx.salon.goal}`);
  if (ctx.salon.instagram) lines.push(`Instagram: ${ctx.salon.instagram}`);

  // Perfil estratégico vivo (a partir de salon_strategy_profile)
  if (ctx.profile) {
    const p = ctx.profile;
    const sigs: string[] = [];
    if (p.maturity_stage) sigs.push(`estágio=${p.maturity_stage}`);
    if (p.current_main_bottleneck) sigs.push(`gargalo=${p.current_main_bottleneck}`);
    if (p.strongest_channel) sigs.push(`canal+forte=${p.strongest_channel}`);
    if (p.weakest_channel) sigs.push(`canal+fraco=${p.weakest_channel}`);
    if (p.strongest_service) sigs.push(`serviço+forte=${p.strongest_service}`);
    if (p.best_customer_segment) sigs.push(`público=${p.best_customer_segment}`);
    if (p.average_ticket_level) sigs.push(`ticket=${p.average_ticket_level}`);
    if (p.retention_level) sigs.push(`retenção=${p.retention_level}`);
    if (p.acquisition_level) sigs.push(`aquisição=${p.acquisition_level}`);
    if (p.communication_tone) sigs.push(`tom=${p.communication_tone}`);
    if (sigs.length) lines.push(`PERFIL: ${sigs.join(' | ')}`);
    if (p.strategic_summary) lines.push(`Resumo estratégico: ${p.strategic_summary}`);
  } else {
    lines.push(`PERFIL: ainda não foi computado (onboarding pendente).`);
  }

  // KPI atual
  if (ctx.latestKpi) {
    const k = ctx.latestKpi;
    const num = (v: number | null | undefined) => v == null ? '—' : Number(v).toFixed(1);
    lines.push(
      `KPIs (último período): Growth Health Score=${num(k.growth_health_score)} | ` +
      `retenção=${num(k.retention_rate)}% | recorrência=${num(k.recurrence_rate)}% | ` +
      `upsell=${num(k.upsell_rate)}% | resposta camp=${num(k.campaign_response_rate)}% | ` +
      `booking camp=${num(k.campaign_booking_rate)}% | no-show=${num(k.no_show_rate)}%`
    );
  } else {
    lines.push(`KPIs: primeiro snapshot ainda não calculado.`);
  }

  // Snapshot rápido do salão
  const c = ctx.counts;
  lines.push(
    `SNAPSHOT clientes: total=${c.total_customers}, ativas=${c.active}, sumidas=${c.inactive}, ` +
    `VIP=${c.vip}, novas=${c.new}, quentes=${c.hot}.`
  );
  lines.push(
    `AGENDA hoje: ${c.appointments_today} agendamentos, ${c.free_slots_today} horários vazios estimados. ` +
    `Campanhas ativas: ${c.active_campaigns}.`
  );

  // Aprendizados recentes (memória)
  if (ctx.recentLearnings.length) {
    lines.push(`MEMÓRIA ESTRATÉGICA (aprendizados recentes):`);
    for (const n of ctx.recentLearnings.slice(0, 5)) {
      const conf = n.confidence_score != null ? ` [conf ${Number(n.confidence_score).toFixed(2)}]` : '';
      const t = n.title ? `${n.title}: ` : '';
      lines.push(`- ${t}${(n.content || '').slice(0, 220)}${conf}`);
    }
  } else {
    lines.push(`MEMÓRIA ESTRATÉGICA: vazia (ainda nenhum experimento concluído).`);
  }

  // Experimentos vencedores
  if (ctx.topExperiments.length) {
    lines.push(`EXPERIMENTOS VENCEDORES:`);
    for (const e of ctx.topExperiments.slice(0, 3)) {
      lines.push(
        `- hipótese="${(e.hypothesis || '').slice(0, 120)}" → ação="${(e.action_taken || '').slice(0, 120)}" ` +
        `(canal=${e.channel_used || '?'}, score=${e.success_score ?? '?'}). ` +
        `Aprendizado: ${(e.ai_learning_summary || '').slice(0, 180)}`
      );
    }
  }

  // Serviços (Service Intelligence — quando enriquecido virá com classificação estratégica)
  if (ctx.services.length) {
    const svcs = ctx.services.map(s => `${s.name} (${s.category || 'geral'}, R$${Number(s.price).toFixed(0)})`).join(', ');
    lines.push(`SERVIÇOS: ${svcs}.`);
  }

  return lines.join('\n');
}

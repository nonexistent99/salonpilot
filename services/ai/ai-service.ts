import { sql, sqlOne } from '@/lib/db/neon';
import { estimateCostUsd } from './cost-estimator';
import { createChatCompletion, resolveOpenAIModel } from './openai-client';
import { CONTENT_GENERATOR_SYSTEM, OWNER_COACH_SYSTEM } from './prompt-templates';

function parseJson<T>(content: string | null | undefined, fallback: T): T {
  if (!content) return fallback;
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

async function createRun(args: {
  salonId: string;
  userId?: string | null;
  runType: string;
  model: string;
}) {
  return sqlOne<{ id: string }>(
    `INSERT INTO ai_runs (salon_id, user_id, run_type, provider, model, status)
     VALUES ($1, $2, $3, 'openai', $4, 'started')
     RETURNING id`,
    [args.salonId, args.userId || null, args.runType, args.model]
  );
}

async function completeRun(args: {
  runId: string;
  model: string;
  started: number;
  responseId: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const cost = estimateCostUsd({
    model: args.model,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
  });

  await sql(
    `UPDATE ai_runs
     SET input_tokens = $2,
         output_tokens = $3,
         estimated_cost_usd = $4,
         latency_ms = $5,
         status = 'completed',
         response_id = $6
     WHERE id = $1`,
    [args.runId, args.inputTokens, args.outputTokens, cost, Date.now() - args.started, args.responseId]
  );
}

export async function generateOwnerCoach(args: {
  salonId: string;
  userId?: string | null;
  question?: string | null;
}) {
  const model = await resolveOpenAIModel('strategic');
  const run = await createRun({ salonId: args.salonId, userId: args.userId, runType: 'owner_coach', model });
  if (!run) throw new Error('Unable to create ai_run');

  const started = Date.now();
  const [salon, stats, services, appointments] = await Promise.all([
    sqlOne(`SELECT name, city, niche, goal FROM salons WHERE id = $1`, [args.salonId]),
    sqlOne(
      `SELECT COUNT(*) as total_customers,
              COUNT(*) FILTER (WHERE status IN ('inactive', 'lost')) as inactive_customers,
              COUNT(*) FILTER (WHERE status = 'vip') as vip_customers,
              ROUND(AVG(average_ticket) FILTER (WHERE average_ticket > 0), 2) as average_ticket,
              SUM(total_spent) as total_spent
       FROM customers
       WHERE salon_id = $1`,
      [args.salonId]
    ),
    sql(`SELECT name, price, duration_minutes FROM services WHERE salon_id = $1 AND active = TRUE LIMIT 12`, [args.salonId]),
    sqlOne(
      `SELECT COUNT(*) as today_count
       FROM appointments
       WHERE salon_id = $1 AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE`,
      [args.salonId]
    ),
  ]);

  try {
    const response = await createChatCompletion({
      model,
      jsonMode: true,
      temperature: 0.45,
      maxTokens: 900,
      messages: [
        { role: 'system', content: OWNER_COACH_SYSTEM },
        {
          role: 'user',
          content: JSON.stringify({
            question: args.question || 'Gere recomendacoes prioritarias para hoje.',
            salon,
            stats,
            services,
            appointments,
          }),
        },
      ],
    });

    await completeRun({
      runId: run.id,
      model: response.model,
      started,
      responseId: response.id,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    });

    return {
      response: parseJson(response.message.content, {
        diagnosis: response.message.content || '',
        reason: '',
        action: '',
        message: null,
        metric: '',
      }),
      provider: 'openai',
      model: response.model,
      ai_run_id: run.id,
    };
  } catch (error) {
    await sql(`UPDATE ai_runs SET status = 'failed', error = $2 WHERE id = $1`, [
      run.id,
      error instanceof Error ? error.message : 'Unknown error',
    ]);
    throw error;
  }
}

export async function generateInstagramContent(args: {
  salonId: string;
  userId?: string | null;
  type: string;
  objective?: string | null;
  prompt?: string | null;
}) {
  const model = await resolveOpenAIModel('fast');
  const run = await createRun({ salonId: args.salonId, userId: args.userId, runType: 'content_generation', model });
  if (!run) throw new Error('Unable to create ai_run');

  const started = Date.now();
  const [salon, services, inactiveCount] = await Promise.all([
    sqlOne(`SELECT name, city, niche, instagram FROM salons WHERE id = $1`, [args.salonId]),
    sql(`SELECT name, price, duration_minutes FROM services WHERE salon_id = $1 AND active = TRUE LIMIT 12`, [args.salonId]),
    sqlOne(`SELECT COUNT(*) as count FROM customers WHERE salon_id = $1 AND status IN ('inactive', 'lost')`, [args.salonId]),
  ]);

  try {
    const response = await createChatCompletion({
      model,
      jsonMode: true,
      temperature: 0.7,
      maxTokens: 900,
      messages: [
        { role: 'system', content: CONTENT_GENERATOR_SYSTEM },
        {
          role: 'user',
          content: JSON.stringify({
            type: args.type,
            objective: args.objective || 'atrair novas clientes',
            prompt: args.prompt || null,
            salon,
            services,
            inactive_customers: inactiveCount,
          }),
        },
      ],
    });

    const parsed = parseJson(response.message.content, {
      type: args.type,
      title: 'Conteudo gerado',
      content: response.message.content || '',
      hashtags: [],
      visual_brief: '',
      cta: '',
      tip: '',
    });

    const hashtags = Array.isArray((parsed as any).hashtags)
      ? (parsed as any).hashtags
      : typeof (parsed as any).hashtags === 'string'
        ? String((parsed as any).hashtags).split(/\s+/).filter(Boolean)
        : [];

    const content = await sqlOne(
      `INSERT INTO instagram_contents (
         salon_id, type, objective, title, content, hashtags, visual_brief, cta, tip, created_by_ai_run_id
       )
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10)
       RETURNING *`,
      [
        args.salonId,
        (parsed as any).type || args.type,
        args.objective || null,
        (parsed as any).title || 'Conteudo gerado',
        (parsed as any).content || '',
        hashtags,
        (parsed as any).visual_brief || null,
        (parsed as any).cta || null,
        (parsed as any).tip || null,
        run.id,
      ]
    );

    await completeRun({
      runId: run.id,
      model: response.model,
      started,
      responseId: response.id,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    });

    return { content, response: parsed, provider: 'openai', model: response.model, ai_run_id: run.id };
  } catch (error) {
    await sql(`UPDATE ai_runs SET status = 'failed', error = $2 WHERE id = $1`, [
      run.id,
      error instanceof Error ? error.message : 'Unknown error',
    ]);
    throw error;
  }
}

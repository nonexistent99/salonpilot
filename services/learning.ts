/**
 * SalonPilot — Learning Layer
 *
 * Fecha o loop: pega um strategy_experiments aberto, calcula resultado real,
 * pede à IA para sintetizar o aprendizado, persiste em:
 *   - strategy_experiments (actual_result, success_score, ai_learning_summary, next_recommendation, completed_at)
 *   - salon_intelligence_notes (memória permanente que alimenta próximas decisões)
 *
 * Chamado pelo webhook Zaia quando `appointment.booked` ou `campaign.response`
 * relacionado a uma campanha de IA chega.
 */

import { sql, sqlOne } from '@/lib/db/neon';
import { generateAI, parseAIJson } from '@/services/ai-service';
import { recordEvent } from '@/services/events';

const LEARNING_SYNTHESIS_SYSTEM = `Você é o Learning Layer do SalonPilot.

Sua tarefa: dado o resultado REAL de um experimento estratégico (campanha de salão), sintetizar APRENDIZADO permanente que vai alimentar futuras decisões.

Compare:
- Hipótese inicial vs realidade
- Resultado esperado vs resultado real
- O que funcionou, o que não funcionou, por que

Saída APENAS JSON neste schema:
{
  "ai_learning_summary": "1-3 frases curtas, conclusão acionável (ex: 'Campanhas com brinde performam 2x melhor que desconto neste salão.')",
  "next_recommendation": "o que tentar em seguida, baseado no aprendizado",
  "intelligence_notes": [
    {
      "note_type": "learning | pattern | warning | opportunity",
      "title": "título curto",
      "content": "1-2 frases acionáveis",
      "confidence": 0.0-1.0
    }
  ],
  "key_signals": ["sinais quantitativos curtos (ex: 'taxa booking 38% vs esperado 25%')"]
}

Regras:
- Seja específica. Cite números reais.
- Se o experimento performou ABAIXO do esperado, marque um note do tipo "warning" com o que evitar.
- Se performou ACIMA, marque "pattern" como replicar.
- Máximo 3 intelligence_notes.`;

export interface CloseExperimentArgs {
  experimentId: string;
  salonId: string;
}

interface ExperimentRow {
  id: string;
  salon_id: string;
  hypothesis: string | null;
  action_taken: string | null;
  audience_used: unknown;
  channel_used: string | null;
  message_used: string | null;
  offer_used: string | null;
  expected_result: unknown;
  actual_result: unknown;
  success_score: number | null;
  completed_at: string | null;
}

interface CampaignTotals {
  id: string;
  sent_count: number;
  responded_count: number;
  booked_count: number;
  estimated_revenue: number;
  recipients_count: number;
  audience_filter_json: { strategy_experiment_id?: string } | null;
}

interface LearningSynthesis {
  ai_learning_summary: string;
  next_recommendation: string;
  intelligence_notes: Array<{
    note_type: string;
    title: string;
    content: string;
    confidence: number;
  }>;
  key_signals: string[];
}

/**
 * Closes a strategy experiment based on actual campaign outcomes,
 * computes success score, asks AI to synthesize learning, and writes
 * intelligence notes. Idempotent: if already completed, returns early.
 */
export async function closeExperimentForCampaign(campaignId: string): Promise<{ closed: boolean; reason?: string; experimentId?: string }> {
  const campaign = await sqlOne<CampaignTotals>(
    `SELECT id, sent_count, responded_count, booked_count, estimated_revenue, recipients_count,
            audience_filter_json
       FROM campaigns WHERE id = $1`,
    [campaignId]
  );
  if (!campaign) return { closed: false, reason: 'campaign not found' };

  const experimentId = campaign.audience_filter_json?.strategy_experiment_id;
  if (!experimentId) return { closed: false, reason: 'no experiment linked' };

  const exp = await sqlOne<ExperimentRow>(
    `SELECT id, salon_id, hypothesis, action_taken, audience_used, channel_used,
            message_used, offer_used, expected_result, actual_result, success_score, completed_at
       FROM strategy_experiments WHERE id = $1`,
    [experimentId]
  );
  if (!exp) return { closed: false, reason: 'experiment not found' };
  if (exp.completed_at) return { closed: false, reason: 'already completed', experimentId };

  // Compute actual metrics
  const sent = campaign.sent_count || 0;
  const responded = campaign.responded_count || 0;
  const booked = campaign.booked_count || 0;
  const actualResponseRate = sent > 0 ? responded / sent : 0;
  const actualBookingRate = sent > 0 ? booked / sent : 0;
  const successScore = sent > 0 ? (0.3 * actualResponseRate + 0.7 * actualBookingRate) : 0;

  const actualResult = {
    sent,
    responded,
    booked,
    response_rate: actualResponseRate,
    booking_rate: actualBookingRate,
    estimated_revenue_real: Number(campaign.estimated_revenue) || 0,
  };

  // Ask AI for learning synthesis
  let synthesis: LearningSynthesis | null = null;
  try {
    const aiRes = await generateAI({
      systemPrompt: LEARNING_SYNTHESIS_SYSTEM,
      userPrompt: JSON.stringify({
        hypothesis: exp.hypothesis,
        action_taken: exp.action_taken,
        channel_used: exp.channel_used,
        offer_used: exp.offer_used,
        message_used: exp.message_used,
        expected_result: exp.expected_result,
        actual_result: actualResult,
      }),
      tier: 'strategic',
      jsonSchema: { type: 'object' },
      temperature: 0.3,
      maxTokens: 800,
    });
    synthesis = parseAIJson<LearningSynthesis>(aiRes);
  } catch (err) {
    console.error('[learning] AI synthesis failed, falling back to numeric only', err);
    synthesis = {
      ai_learning_summary: `Resultado: ${booked}/${sent} agendaram (${(actualBookingRate * 100).toFixed(1)}%).`,
      next_recommendation: 'Coletar mais ciclos antes de mudar estratégia.',
      intelligence_notes: [],
      key_signals: [`booking_rate=${(actualBookingRate * 100).toFixed(1)}%`],
    };
  }

  // Persist experiment closure
  await sql(
    `UPDATE strategy_experiments
        SET actual_result = $2::jsonb,
            success_score = $3,
            ai_learning_summary = $4,
            next_recommendation = $5,
            completed_at = NOW()
      WHERE id = $1`,
    [
      experimentId,
      JSON.stringify(actualResult),
      successScore,
      synthesis.ai_learning_summary?.slice(0, 1000) || null,
      synthesis.next_recommendation?.slice(0, 1000) || null,
    ]
  );

  // Persist intelligence notes (memory)
  for (const n of synthesis.intelligence_notes || []) {
    await sql(
      `INSERT INTO salon_intelligence_notes
         (salon_id, note_type, title, content, source, confidence_score, related_campaign_id)
       VALUES ($1, $2, $3, $4, 'strategy_experiment', $5, $6)`,
      [
        exp.salon_id,
        (n.note_type || 'learning').slice(0, 50),
        (n.title || 'Aprendizado').slice(0, 200),
        (n.content || '').slice(0, 1000),
        n.confidence ?? 0.6,
        campaignId,
      ]
    ).catch(err => console.error('[learning] note insert failed', err));
  }

  // Mark campaign finished
  await sql(
    `UPDATE campaigns SET status = 'finished', finished_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'active'`,
    [campaignId]
  );

  await recordEvent({
    salonId: exp.salon_id,
    eventType: 'learning.experiment_closed',
    source: 'system',
    text: `Experimento "${exp.action_taken}" fechado: ${booked}/${sent} agendaram (score ${successScore.toFixed(2)}).`,
    data: {
      experiment_id: experimentId,
      campaign_id: campaignId,
      success_score: successScore,
      summary: synthesis.ai_learning_summary,
    },
  });

  return { closed: true, experimentId };
}

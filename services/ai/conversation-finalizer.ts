import { sql, sqlOne } from '@/lib/db/neon';
import { createFollowUpTask } from '@/services/crm/lead-service';
import { saveClientMemory } from '@/services/crm/memory-service';
import { createChatCompletion } from './openai-client';
import { CONVERSATION_FINALIZER_SYSTEM } from './prompt-templates';

function parseJson(text: string | null | undefined) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
}

export async function finalizeConversation(args: {
  salonId: string;
  threadId: string;
  outcome?: string;
}) {
  const thread = await sqlOne<{
    id: string;
    customer_id: string;
    appointment_id: string | null;
    lead_stage: string | null;
  }>(
    `SELECT id, customer_id, appointment_id, lead_stage
     FROM conversation_threads
     WHERE salon_id = $1 AND id = $2`,
    [args.salonId, args.threadId]
  );

  if (!thread) throw new Error('Thread not found');

  const [messages, toolCalls] = await Promise.all([
    sql(
      `SELECT direction, sender_type, content, created_at
       FROM messages
       WHERE thread_id = $1
       ORDER BY created_at ASC
       LIMIT 80`,
      [args.threadId]
    ),
    sql(
      `SELECT name, arguments_json, result_json, status, created_at
       FROM tool_calls
       WHERE thread_id = $1
       ORDER BY created_at ASC
       LIMIT 40`,
      [args.threadId]
    ),
  ]);

  const fallback = {
    summary: messages.map((m: any) => `${m.direction}: ${m.content}`).slice(-6).join(' | '),
    outcome: args.outcome || (thread.appointment_id ? 'appointment_created' : 'resolved_without_booking'),
    lead_stage: thread.lead_stage || 'new',
    service_interests: [],
    appointment_id: thread.appointment_id,
    client_preferences: [],
    objections: [],
    sentiment: 'neutral',
    recommended_tags: [],
    follow_up: { needed: false, reason: null, suggested_message: null, due_at: null },
  };

  let parsed = fallback;
  try {
    const response = await createChatCompletion({
      tier: 'fast',
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 800,
      messages: [
        { role: 'system', content: CONVERSATION_FINALIZER_SYSTEM },
        {
          role: 'user',
          content: JSON.stringify({
            expected_outcome: args.outcome || null,
            messages,
            tool_calls: toolCalls,
            current_appointment_id: thread.appointment_id,
          }),
        },
      ],
    });

    parsed = parseJson(response.message.content) || fallback;
  } catch {
    parsed = fallback;
  }

  await sql(
    `UPDATE conversation_threads
     SET summary = $3,
         summary_json = $4::jsonb,
         outcome = $5,
         status = CASE WHEN status = 'human_handoff' THEN status ELSE 'completed' END,
         closed_at = COALESCE(closed_at, NOW()),
         updated_at = NOW()
     WHERE salon_id = $1 AND id = $2`,
    [
      args.salonId,
      args.threadId,
      parsed.summary || fallback.summary,
      JSON.stringify(parsed),
      parsed.outcome || fallback.outcome,
    ]
  );

  const preferences = Array.isArray(parsed.client_preferences) ? parsed.client_preferences : [];
  for (const preference of preferences.slice(0, 5)) {
    if (typeof preference === 'string' && preference.trim()) {
      await saveClientMemory({
        salonId: args.salonId,
        customerId: thread.customer_id,
        type: 'preference',
        content: preference,
        confidence: 0.7,
        sourceThreadId: args.threadId,
      });
    }
  }

  const tags = Array.isArray(parsed.recommended_tags) ? parsed.recommended_tags : [];
  for (const tag of tags.slice(0, 5)) {
    if (typeof tag !== 'string' || !tag.trim()) continue;
    const tagRow = await sqlOne<{ id: string }>(
      `INSERT INTO customer_tags (salon_id, name, color)
       VALUES ($1, $2, '#C78A6A')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [args.salonId, tag.trim()]
    );
    if (tagRow) {
      await sql(
        `INSERT INTO customer_tag_relations (customer_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [thread.customer_id, tagRow.id]
      );
    }
  }

  if (parsed.follow_up?.needed && parsed.follow_up?.due_at) {
    await createFollowUpTask({
      salonId: args.salonId,
      customerId: thread.customer_id,
      threadId: args.threadId,
      dueAt: parsed.follow_up.due_at,
      reason: parsed.follow_up.reason || 'Follow-up recomendado pela IA',
      messageSuggestion: parsed.follow_up.suggested_message || null,
    });
  }

  return parsed;
}

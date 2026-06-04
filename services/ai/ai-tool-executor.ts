import { sql, sqlOne } from '@/lib/db/neon';
import { listAvailableSlots } from '@/services/appointments/availability-service';
import { createAppointment } from '@/services/appointments/appointment-service';
import { saveLeadStatus } from '@/services/crm/client-service';
import { createFollowUpTask } from '@/services/crm/lead-service';
import { saveClientMemory } from '@/services/crm/memory-service';

type ExecuteToolArgs = {
  aiRunId: string;
  salonId: string;
  threadId: string;
  customerId: string;
  toolName: string;
  rawArguments: string;
};

function parseArguments(raw: string) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function asUuid(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

async function logToolCall(args: {
  aiRunId: string;
  salonId: string;
  threadId: string;
  name: string;
  argumentsJson: unknown;
  resultJson: unknown;
  status: string;
  latencyMs: number;
}) {
  await sql(
    `INSERT INTO tool_calls (ai_run_id, salon_id, thread_id, name, arguments_json, result_json, status, latency_ms)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
    [
      args.aiRunId,
      args.salonId,
      args.threadId,
      args.name,
      JSON.stringify(args.argumentsJson || {}),
      JSON.stringify(args.resultJson || {}),
      args.status,
      args.latencyMs,
    ]
  );
}

export async function executeCustomerTool(args: ExecuteToolArgs) {
  const started = Date.now();
  const parsed = parseArguments(args.rawArguments);
  let result: unknown;
  let status = 'success';

  try {
    switch (args.toolName) {
      case 'listServices': {
        const rows = await sql(
          `SELECT s.id, s.name, s.description, s.price, s.duration_minutes,
                  COALESCE(json_agg(jsonb_build_object('id', p.id, 'name', p.name))
                    FILTER (WHERE p.id IS NOT NULL), '[]') as professionals
           FROM services s
           LEFT JOIN professional_services ps ON ps.service_id = s.id
           LEFT JOIN professionals p ON p.id = ps.professional_id AND p.active = TRUE
           WHERE s.salon_id = $1
             AND s.active = TRUE
             AND ($2::text IS NULL OR s.name ILIKE '%' || $2 || '%' OR s.description ILIKE '%' || $2 || '%')
           GROUP BY s.id
           ORDER BY s.name`,
          [args.salonId, parsed.query || null]
        );
        result = { success: true, services: rows };
        break;
      }

      case 'getServiceDetails': {
        const service = await sqlOne(
          `SELECT s.id, s.name, s.description, s.price, s.duration_minutes, s.notes, s.rules_json,
                  COALESCE(json_agg(jsonb_build_object('id', p.id, 'name', p.name))
                    FILTER (WHERE p.id IS NOT NULL), '[]') as professionals
           FROM services s
           LEFT JOIN professional_services ps ON ps.service_id = s.id
           LEFT JOIN professionals p ON p.id = ps.professional_id AND p.active = TRUE
           WHERE s.salon_id = $1
             AND s.active = TRUE
             AND ($2::uuid IS NULL OR s.id = $2::uuid)
             AND ($3::text IS NULL OR s.name ILIKE '%' || $3 || '%')
           GROUP BY s.id
           ORDER BY s.name
           LIMIT 1`,
          [args.salonId, asUuid(parsed.service_id), parsed.service_name || parsed.service_id || null]
        );
        result = service ? { success: true, service } : { success: false, message: 'Servico nao encontrado.' };
        break;
      }

      case 'listAvailableSlots': {
        result = await listAvailableSlots({
          salonId: args.salonId,
          serviceId: parsed.service_id,
          date: parsed.date,
          professionalId: parsed.professional_id || null,
        });
        if ((result as any).success && parsed.service_id) {
          await sql(
            `UPDATE conversation_threads
             SET service_in_focus_id = $3, lead_stage = 'booking_intent', updated_at = NOW()
             WHERE salon_id = $1 AND id = $2`,
            [args.salonId, args.threadId, parsed.service_id]
          );
        }
        break;
      }

      case 'createAppointment': {
        result = await createAppointment({
          salonId: args.salonId,
          customerId: args.customerId,
          serviceId: parsed.service_id,
          startTime: parsed.start_time,
          professionalId: parsed.professional_id || null,
          sourceThreadId: args.threadId,
          notes: parsed.notes || null,
          createdByAiRunId: args.aiRunId,
        });
        break;
      }

      case 'transferToHuman':
      case 'rescheduleAppointment':
      case 'cancelAppointmentRequest': {
        await sql(
          `UPDATE conversation_threads
           SET status = 'human_handoff', ai_enabled = FALSE, updated_at = NOW()
           WHERE salon_id = $1 AND id = $2`,
          [args.salonId, args.threadId]
        );
        await sql(
          `INSERT INTO lead_events (salon_id, customer_id, thread_id, event_type, metadata)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            args.salonId,
            args.customerId,
            args.threadId,
            args.toolName === 'transferToHuman' ? 'human_handoff' : args.toolName,
            JSON.stringify({ reason: parsed.reason || null, urgency: parsed.urgency || 'normal' }),
          ]
        );
        result = { success: true, status: 'human_handoff', message: 'Uma atendente vai assumir a conversa.' };
        break;
      }

      case 'saveLeadStatus': {
        result = await saveLeadStatus({
          salonId: args.salonId,
          customerId: args.customerId,
          threadId: args.threadId,
          leadStage: parsed.lead_stage,
          serviceInterest: parsed.service_interest || null,
          notes: parsed.notes || null,
        });
        break;
      }

      case 'saveClientMemory': {
        result = await saveClientMemory({
          salonId: args.salonId,
          customerId: args.customerId,
          type: parsed.type,
          content: parsed.content,
          confidence: parsed.confidence,
          sourceThreadId: args.threadId,
        });
        break;
      }

      case 'createFollowUpTask': {
        result = await createFollowUpTask({
          salonId: args.salonId,
          customerId: args.customerId,
          threadId: args.threadId,
          dueAt: parsed.due_at,
          reason: parsed.reason,
          messageSuggestion: parsed.message_suggestion || null,
        });
        break;
      }

      default:
        status = 'error';
        result = { success: false, message: `Tool desconhecida: ${args.toolName}` };
    }
  } catch (error) {
    status = 'error';
    result = { success: false, message: error instanceof Error ? error.message : 'Erro na tool.' };
  }

  await logToolCall({
    aiRunId: args.aiRunId,
    salonId: args.salonId,
    threadId: args.threadId,
    name: args.toolName,
    argumentsJson: parsed,
    resultJson: result,
    status,
    latencyMs: Date.now() - started,
  });

  return result;
}

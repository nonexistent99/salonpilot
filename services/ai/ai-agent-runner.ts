import crypto from "node:crypto";
import { ApiError } from "@/lib/api-error";
import { sql, sqlOne, transaction } from "@/lib/db/neon";
import {
  markMessagesProcessed,
  getUnprocessedInboundMessages,
} from "@/services/messaging/message-buffer";
import { sendThreadText } from "@/services/messaging/thread-outbound";
import { customerAssistantTools } from "./ai-tool-schemas";
import { executeCustomerTool } from "./ai-tool-executor";
import { composeCustomerContext } from "./context-composer";
import { estimateCostUsd } from "./cost-estimator";
import {
  createChatCompletion,
  resolveOpenAIModel,
  type ChatMessage,
  type ChatTool,
} from "./openai-client";
import { CUSTOMER_ASSISTANT_SYSTEM, renderPrompt } from "./prompt-templates";
import { finalizeConversation } from "./conversation-finalizer";

function buildBatchText(
  messages: Array<{ content: string | null; message_type: string }>,
) {
  if (messages.length === 1) {
    return messages[0].content || `[${messages[0].message_type}]`;
  }

  return `Cliente enviou em sequencia:\n${messages.map((m, index) => `${index + 1}) ${m.content || `[${m.message_type}]`}`).join("\n")}`;
}

function normalizeGuardText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mentionsAppointmentConfirmation(text: string) {
  const normalized = normalizeGuardText(text);
  return [
    /\b(agendamento|horario|servico|procedimento)\s+(confirmad[ao]|marcad[ao]|agendad[ao])\b/,
    /\b(confirmad[ao]|marcad[ao]|agendad[ao])\s+(para|no|na|as)\b/,
    /\b(ficou|esta|ta)\s+(confirmad[ao]|marcad[ao]|agendad[ao])\b/,
    /\b(te|voce)\s+(agendei|marquei|reservei)\b/,
    /\b(agendei|marquei|reservei)\b/,
  ].some((pattern) => pattern.test(normalized));
}

type RunArgs = {
  salonId: string;
  threadId: string;
  userId?: string | null;
  batchText?: string | null;
  sendOutbound?: boolean;
};
export async function runCustomerAgent(args: RunArgs) {
  return transaction(async (client) => {
    const lock = await client.query(
      "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked",
      [`agent:${args.salonId}:${args.threadId}`],
    );
    if (!lock.rows[0].locked)
      throw new ApiError(409, "Conversation is already being processed");
    return runLocked(args);
  });
}
async function runLocked(args: RunArgs) {
  const context = await composeCustomerContext({
    salonId: args.salonId,
    threadId: args.threadId,
  });

  if (!context.thread.ai_enabled || context.thread.status === "human_handoff") {
    return { skipped: true, reason: "AI disabled for thread" };
  }

  const unprocessed = (await getUnprocessedInboundMessages(
    args.salonId,
    args.threadId,
  )) as Array<{
    id: string;
    content: string | null;
    message_type: string;
  }>;
  if (!args.batchText && unprocessed.length === 0) {
    return { skipped: true, reason: "No inbound text to process" };
  }
  const batchText = args.batchText || buildBatchText(unprocessed);
  if (!batchText.trim())
    return { skipped: true, reason: "No inbound text to process" };

  if (context.thread.channel === "instagram") {
    const account = await sqlOne(
      "SELECT ai_enabled FROM instagram_accounts WHERE salon_id=$1 AND id=$2 AND status='connected'",
      [args.salonId, context.thread.instagram_account_id],
    );
    if (!account?.ai_enabled)
      return { skipped: true, reason: "Instagram AI disabled" };
  }
  // Reuse a durable draft on retries; tools must not run again just to retry delivery.
  const replyKey = crypto
    .createHash("sha256")
    .update(
      `${args.salonId}:${args.threadId}:${unprocessed
        .map((m) => m.id)
        .sort()
        .join(",")}:${args.batchText || ""}`,
    )
    .digest("hex");
  const draft = await sqlOne(
    "SELECT content FROM ai_reply_drafts WHERE id=$1 AND salon_id=$2 AND thread_id=$3",
    [replyKey, args.salonId, args.threadId],
  );
  if (draft && args.sendOutbound !== false) {
    await sendThreadText({
      salonId: args.salonId,
      threadId: args.threadId,
      text: draft.content,
      senderType: "ai",
      idempotencyKey: replyKey,
    });
    await markMessagesProcessed(
      args.salonId,
      unprocessed.map((m) => m.id),
    );
    return { success: true, response: draft.content };
  }
  const model = await resolveOpenAIModel("fast");
  const run = await sqlOne<{ id: string }>(
    `INSERT INTO ai_runs (salon_id, thread_id, user_id, run_type, provider, model, status)
     VALUES ($1, $2, $3, 'customer_reply', 'openai', $4, 'started')
     RETURNING id`,
    [args.salonId, args.threadId, args.userId || null, model],
  );

  if (!run) throw new Error("Unable to create ai_run");

  const started = Date.now();
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        renderPrompt(CUSTOMER_ASSISTANT_SYSTEM, {
          salon_name: context.salon.name,
        }) +
        (context.thread.channel === "instagram"
          ? "\nResponda em no máximo 200 caracteres, para respeitar o limite da mensagem do Instagram."
          : ""),
    },
    {
      role: "user",
      content: `Contexto operacional:\n${context.contextText}\n\nMensagem atual:\n${batchText}`,
    },
  ];

  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let finalText = "";
  let lastResponseId: string | null = null;
  let appointmentCreated = false;
  let handoff = false;

  try {
    for (let step = 0; step < 4; step++) {
      const result = await createChatCompletion({
        model,
        messages,
        tools: customerAssistantTools as unknown as ChatTool[],
        temperature: 0.35,
        maxTokens: 900,
      });

      // Chat Completions ids are trace ids only; they are not conversation memory.
      lastResponseId = result.id;
      inputTokens += result.usage.prompt_tokens || 0;
      outputTokens += result.usage.completion_tokens || 0;
      cachedInputTokens +=
        result.usage.prompt_tokens_details?.cached_tokens || 0;

      const toolCalls = result.message.tool_calls || [];
      if (toolCalls.length === 0) {
        finalText = result.message.content || "";
        break;
      }

      messages.push({
        role: "assistant",
        content: result.message.content || null,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const toolResult = await executeCustomerTool({
          aiRunId: run.id,
          salonId: args.salonId,
          threadId: args.threadId,
          customerId: context.customer.id,
          toolName: toolCall.function.name,
          rawArguments: toolCall.function.arguments,
        });

        if (
          toolCall.function.name === "createAppointment" &&
          (toolResult as any).success
        ) {
          appointmentCreated = true;
        }
        if (
          toolCall.function.name === "transferToHuman" ||
          (toolResult as any).status === "human_handoff"
        ) {
          handoff = true;
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    if (!finalText) {
      finalText = handoff
        ? "Entendi. Vou pedir para uma atendente assumir por aqui e te ajudar direitinho."
        : "Certo, vou te ajudar com isso. Pode me mandar mais um detalhe?";
    }

    if (!appointmentCreated && mentionsAppointmentConfirmation(finalText)) {
      await executeCustomerTool({
        aiRunId: run.id,
        salonId: args.salonId,
        threadId: args.threadId,
        customerId: context.customer.id,
        toolName: "transferToHuman",
        rawArguments: JSON.stringify({
          reason:
            "A resposta da IA mencionou confirmacao de agenda sem createAppointment success=true.",
          urgency: "high",
        }),
      });
      handoff = true;
      finalText =
        "Quero confirmar isso com seguranca antes de te passar como marcado. Vou pedir para uma atendente assumir por aqui e verificar a agenda direitinho.";
    }

    const estimatedCost = estimateCostUsd({ model, inputTokens, outputTokens });

    await sql(
      `UPDATE ai_runs
       SET input_tokens = $2,
           output_tokens = $3,
           cached_input_tokens = $4,
           estimated_cost_usd = $5,
           latency_ms = $6,
           status = 'completed',
           response_id = $7
       WHERE id = $1`,
      [
        run.id,
        inputTokens,
        outputTokens,
        cachedInputTokens,
        estimatedCost,
        Date.now() - started,
        lastResponseId,
      ],
    );

    await sql(
      `INSERT INTO ai_usage_daily (
         salon_id, date, total_runs, total_input_tokens, total_output_tokens, total_cost_usd, customer_replies
       )
       VALUES ($1, CURRENT_DATE, 1, $2, $3, $4, 1)
       ON CONFLICT (salon_id, date)
       DO UPDATE SET total_runs = ai_usage_daily.total_runs + 1,
                     total_input_tokens = ai_usage_daily.total_input_tokens + $2,
                     total_output_tokens = ai_usage_daily.total_output_tokens + $3,
                     total_cost_usd = ai_usage_daily.total_cost_usd + $4,
                     customer_replies = ai_usage_daily.customer_replies + 1,
                     updated_at = NOW()`,
      [args.salonId, inputTokens, outputTokens, estimatedCost],
    );

    await sql(
      `UPDATE conversation_threads
       SET status = CASE WHEN status IN ('completed', 'human_handoff') THEN status ELSE 'waiting_client' END,
           updated_at = NOW()
       WHERE salon_id = $1 AND id = $2`,
      [args.salonId, args.threadId],
    );

    await sql(
      "INSERT INTO ai_reply_drafts(id,salon_id,thread_id,content) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [replyKey, args.salonId, args.threadId, finalText],
    );
    if (args.sendOutbound !== false) {
      await sendThreadText({
        salonId: args.salonId,
        threadId: args.threadId,
        text: finalText,
        senderType: handoff ? "system" : "ai",
        idempotencyKey: replyKey,
      });
      await markMessagesProcessed(
        args.salonId,
        unprocessed.map((m) => m.id),
      );
    }

    if (appointmentCreated) {
      await finalizeConversation({
        salonId: args.salonId,
        threadId: args.threadId,
        outcome: "appointment_created",
      });
    } else if (handoff) {
      await finalizeConversation({
        salonId: args.salonId,
        threadId: args.threadId,
        outcome: "human_handoff",
      });
    }

    return {
      success: true,
      response: finalText,
      ai_run_id: run.id,
      appointment_created: appointmentCreated,
      human_handoff: handoff,
    };
  } catch (error) {
    await sql(
      `UPDATE ai_runs
       SET status = 'failed', error = $2, latency_ms = $3
       WHERE id = $1`,
      [
        run.id,
        error instanceof Error ? error.message : "Unknown AI error",
        Date.now() - started,
      ],
    );
    throw error;
  }
}

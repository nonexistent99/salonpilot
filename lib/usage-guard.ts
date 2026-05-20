import { CREDIT_COSTS, type CreditAction, hasCredits } from "@/services/credit-service";

// Compatible with our DbClient wrapper
type SupabaseClient = any;

export type ActionType =
  | "SEARCH"
  | "GENERATE_SCRIPT"
  | "GENERATE_MUSIC"
  | "ANALYZE_LEAD"
  | "MOVE_PIPELINE"
  | "CREATE_MEETING";

type GuardResult =
  | { allowed: true; subscription: Record<string, unknown>; agencyId: string }
  | { allowed: false; error: string; status: number };

const ACTION_LIMITS: Record<ActionType, { field: string; limitField: string } | null> = {
  SEARCH: { field: "searches_used", limitField: "searches_limit" },
  GENERATE_SCRIPT: { field: "ai_credits_used", limitField: "ai_credits_limit" },
  GENERATE_MUSIC: { field: "music_used", limitField: "music_limit" },
  ANALYZE_LEAD: { field: "ai_credits_used", limitField: "ai_credits_limit" },
  MOVE_PIPELINE: null,
  CREATE_MEETING: null,
};

// Rate limit: in-memory store (per-instance, resets on deploy)
const rateLimitMap = new Map<string, { count: number; windowStart: number; lastCall: number }>();

const RATE_COOLDOWN_MS = 10_000; // 10 seconds between AI calls
const RATE_MAX_PER_MINUTE = 5;

/**
 * Central access control. ALL routes MUST use this.
 * Validates auth, subscription status, and per-action limits.
 */
export async function checkAgencyAccess(
  supabase: SupabaseClient,
  userId: string,
  actionType: ActionType
): Promise<GuardResult> {
  // 1. Get profile + agency_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", userId)
    .single();

  if (!profile?.agency_id) {
    return { allowed: false, error: "Agencia nao encontrada", status: 400 };
  }

  const agencyId = profile.agency_id as string;

  // 2. Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("agency_id", agencyId)
    .single();

  if (!subscription) {
    return { allowed: false, error: "Sem assinatura encontrada", status: 403 };
  }

  // 3. Check subscription status
  if (subscription.status !== "active") {
    return {
      allowed: false,
      error: "Sua assinatura nao esta ativa. Entre em contato com o suporte.",
      status: 403,
    };
  }

  // 4. Check per-action limits
  const limitConfig = ACTION_LIMITS[actionType];
  if (limitConfig) {
    const used = Number(subscription[limitConfig.field] ?? 0);
    const limit = Number(subscription[limitConfig.limitField] ?? 0);

    if (used >= limit) {
      return {
        allowed: false,
        error: `Limite atingido (${used}/${limit}). Faca upgrade do plano para "${actionType}".`,
        status: 403,
      };
    }
  }

  // 5. Credit system check for credit-consuming actions
  const creditActions: ActionType[] = ["SEARCH", "GENERATE_SCRIPT", "GENERATE_MUSIC", "ANALYZE_LEAD"];
  if (creditActions.includes(actionType)) {
    const creditCheck = await hasCredits(supabase, agencyId, actionType as CreditAction);
    if (!creditCheck.hasEnough) {
      return {
        allowed: false,
        error: `Creditos insuficientes. Necessario: ${creditCheck.cost}, disponivel: ${creditCheck.balance}. Compre mais creditos.`,
        status: 403,
      };
    }
  }

  // 6. Rate limit for AI actions (GENERATE_SCRIPT, GENERATE_MUSIC)
  if (actionType === "GENERATE_SCRIPT" || actionType === "GENERATE_MUSIC") {
    const key = `${agencyId}:${actionType}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (entry) {
      // Cooldown check (10s between calls)
      if (now - entry.lastCall < RATE_COOLDOWN_MS) {
        return {
          allowed: false,
          error: "Aguarde 10 segundos entre geracoes de IA.",
          status: 429,
        };
      }

      // Per-minute check
      if (now - entry.windowStart < 60_000) {
        if (entry.count >= RATE_MAX_PER_MINUTE) {
          return {
            allowed: false,
            error: "Limite de 5 geracoes por minuto atingido. Aguarde.",
            status: 429,
          };
        }
        entry.count++;
        entry.lastCall = now;
      } else {
        // Reset window
        entry.windowStart = now;
        entry.count = 1;
        entry.lastCall = now;
      }
    } else {
      rateLimitMap.set(key, { count: 1, windowStart: now, lastCall: now });
    }
  }

  return { allowed: true, subscription: subscription as Record<string, unknown>, agencyId };
}

/**
 * Increment usage counter for a specific action.
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  agencyId: string,
  actionType: ActionType,
  subscription: Record<string, unknown>
): Promise<void> {
  const limitConfig = ACTION_LIMITS[actionType];
  if (!limitConfig) return;

  const currentUsed = Number(subscription[limitConfig.field] ?? 0);
  await supabase
    .from("subscriptions")
    .update({ [limitConfig.field]: currentUsed + 1 })
    .eq("agency_id", agencyId);
}

/**
 * Update AI cost estimation on subscription.
 */
export async function updateAiCostEstimate(
  supabase: SupabaseClient,
  agencyId: string,
  tokensUsed: number
): Promise<void> {
  // Gemini 1.5 Flash pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output
  // Simplified: ~$0.0002 per 1K tokens average
  const costPerToken = 0.0000002;
  const callCost = tokensUsed * costPerToken;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("ai_estimated_cost_month")
    .eq("agency_id", agencyId)
    .single();

  const currentCost = Number(sub?.ai_estimated_cost_month ?? 0);

  await supabase
    .from("subscriptions")
    .update({ ai_estimated_cost_month: currentCost + callCost })
    .eq("agency_id", agencyId);
}

type SupabaseClient = any;

export const CREDIT_COSTS = {
  SEARCH: 1,           // Layer 1: Data discovery only
  ANALYZE_LEAD: 2,     // Layer 2: AI analysis on demand
  GENERATE_SCRIPT: 2,  // Legacy - included in ANALYZE_LEAD
  GENERATE_MUSIC: 10,  // Jingle generation
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/**
 * Check if agency has enough credits for an action.
 */
export async function hasCredits(
  supabase: SupabaseClient,
  agencyId: string,
  action: CreditAction
): Promise<{ hasEnough: boolean; balance: number; cost: number }> {
  const cost = CREDIT_COSTS[action];

  const { data } = await supabase
    .from("credits")
    .select("balance")
    .eq("agency_id", agencyId)
    .single();

  const balance = data?.balance ?? 0;
  return { hasEnough: balance >= cost, balance, cost };
}

/**
 * Deduct credits for an action. Returns false if insufficient.
 */
export async function deductCredits(
  supabase: SupabaseClient,
  agencyId: string,
  action: CreditAction,
  description?: string
): Promise<{ success: boolean; newBalance: number }> {
  const cost = CREDIT_COSTS[action];

  // Atomic: get current balance
  const { data: credit } = await supabase
    .from("credits")
    .select("balance, lifetime_used")
    .eq("agency_id", agencyId)
    .single();

  if (!credit || credit.balance < cost) {
    return { success: false, newBalance: credit?.balance ?? 0 };
  }

  const newBalance = credit.balance - cost;
  const newUsed = (credit.lifetime_used ?? 0) + cost;

  // Update balance
  await supabase
    .from("credits")
    .update({ balance: newBalance, lifetime_used: newUsed, updated_at: new Date().toISOString() })
    .eq("agency_id", agencyId);

  // Log transaction
  await supabase.from("credit_transactions").insert({
    agency_id: agencyId,
    amount: -cost,
    type: "usage",
    action,
    description: description || `Uso: ${action} (-${cost} creditos)`,
  });

  return { success: true, newBalance };
}

/**
 * Add credits to an agency (purchase, bonus, etc).
 */
export async function addCredits(
  supabase: SupabaseClient,
  agencyId: string,
  amount: number,
  type: "purchase" | "bonus" | "refund",
  stripeSessionId?: string,
  description?: string
): Promise<{ newBalance: number }> {
  const { data: credit } = await supabase
    .from("credits")
    .select("balance, lifetime_purchased")
    .eq("agency_id", agencyId)
    .single();

  if (!credit) {
    // Create credits row
    await supabase.from("credits").insert({
      agency_id: agencyId,
      balance: amount,
      lifetime_purchased: amount,
    });

    await supabase.from("credit_transactions").insert({
      agency_id: agencyId,
      amount,
      type,
      stripe_session_id: stripeSessionId,
      description: description || `Compra de ${amount} creditos`,
    });

    return { newBalance: amount };
  }

  const newBalance = credit.balance + amount;
  const newPurchased = (credit.lifetime_purchased ?? 0) + (type === "purchase" ? amount : 0);

  await supabase
    .from("credits")
    .update({
      balance: newBalance,
      lifetime_purchased: newPurchased,
      updated_at: new Date().toISOString(),
    })
    .eq("agency_id", agencyId);

  await supabase.from("credit_transactions").insert({
    agency_id: agencyId,
    amount,
    type,
    stripe_session_id: stripeSessionId,
    description: description || `${type === "purchase" ? "Compra" : type === "bonus" ? "Bonus" : "Reembolso"} de ${amount} creditos`,
  });

  return { newBalance };
}

/**
 * Get credit balance and transaction history.
 */
export async function getCreditInfo(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
  recentTransactions: Record<string, unknown>[];
}> {
  const { data: credit } = await supabase
    .from("credits")
    .select("*")
    .eq("agency_id", agencyId)
    .single();

  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    balance: credit?.balance ?? 0,
    lifetimePurchased: credit?.lifetime_purchased ?? 0,
    lifetimeUsed: credit?.lifetime_used ?? 0,
    recentTransactions: transactions ?? [],
  };
}

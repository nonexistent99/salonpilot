const DEFAULT_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 5, output: 15 },
};

function configuredCosts(): Record<string, { input: number; output: number }> {
  if (!process.env.OPENAI_MODEL_COSTS_JSON) return DEFAULT_COSTS;
  try {
    return { ...DEFAULT_COSTS, ...JSON.parse(process.env.OPENAI_MODEL_COSTS_JSON) };
  } catch {
    return DEFAULT_COSTS;
  }
}

export function estimateCostUsd(args: { model: string; inputTokens?: number; outputTokens?: number }) {
  const costs = configuredCosts();
  const modelCost = costs[args.model] || { input: 0, output: 0 };
  const input = ((args.inputTokens || 0) / 1_000_000) * modelCost.input;
  const output = ((args.outputTokens || 0) / 1_000_000) * modelCost.output;
  return Number((input + output).toFixed(6));
}

/** Shared OpenAI adapter for the legacy strategy/marketing modules. */
import { createChatCompletion } from "./ai/openai-client";
export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  tier?: "strategic" | "fast";
}
export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokens?: { prompt: number; completion: number };
}
export async function generateAI(req: AIRequest): Promise<AIResponse> {
  const result = await createChatCompletion({
    messages: [
      { role: "system", content: req.systemPrompt },
      { role: "user", content: req.userPrompt },
    ],
    model: req.model,
    tier: req.tier,
    temperature: req.temperature,
    maxTokens: req.maxTokens,
    jsonMode: !!req.jsonSchema,
  });
  if (!result.message.content?.trim()) throw new Error("Empty OpenAI response");
  return {
    content: result.message.content,
    provider: "openai",
    model: result.model,
    tokens: {
      prompt: result.usage.prompt_tokens,
      completion: result.usage.completion_tokens,
    },
  };
}
export function parseAIJson<T>(response: AIResponse): T {
  const content = response.content
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  return JSON.parse(content) as T;
}

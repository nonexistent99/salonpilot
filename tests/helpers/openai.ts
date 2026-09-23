export const calls: any[] = [];
export async function resolveOpenAIModel() {
  return "test-model";
}
export async function createChatCompletion(input: any) {
  calls.push(input);
  return {
    id: "test-completion",
    model: "test-model",
    message: {
      role: "assistant",
      content: "Resposta exclusiva do salão atual.",
    },
    usage: { prompt_tokens: 12, completion_tokens: 8 },
  };
}

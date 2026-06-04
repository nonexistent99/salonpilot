import { getOpenAIKey, getPlatformSetting } from '@/services/admin/settings-service';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

export type ChatTool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenAIChatResult = {
  id: string;
  model: string;
  message: ChatMessage;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
};

export async function resolveOpenAIModel(tier: 'fast' | 'strategic' = 'fast') {
  if (tier === 'strategic') {
    return process.env.OPENAI_MODEL_STRATEGIC
      || await getPlatformSetting<string>('OPENAI_MODEL_STRATEGIC')
      || 'gpt-4o';
  }

  return process.env.OPENAI_MODEL_FAST
    || await getPlatformSetting<string>('OPENAI_MODEL_FAST')
    || 'gpt-4o-mini';
}

export async function createChatCompletion(args: {
  messages: ChatMessage[];
  tools?: readonly ChatTool[];
  model?: string;
  tier?: 'fast' | 'strategic';
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<OpenAIChatResult> {
  const apiKey = await getOpenAIKey();
  const model = args.model || await resolveOpenAIModel(args.tier || 'fast');

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    return {
      id: `mock_${Date.now()}`,
      model: 'mock-openai',
      message: {
        role: 'assistant',
        content: 'Posso te ajudar com valores, horarios e agendamentos. Me diga qual servico voce quer fazer.',
      },
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: args.messages,
      tools: args.tools,
      tool_choice: args.tools?.length ? 'auto' : undefined,
      temperature: args.temperature ?? 0.4,
      max_tokens: args.maxTokens ?? 900,
      response_format: args.jsonMode ? { type: 'json_object' } : undefined,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return {
    id: data.id,
    model: data.model || model,
    message: data.choices?.[0]?.message || { role: 'assistant', content: '' },
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0 },
  };
}

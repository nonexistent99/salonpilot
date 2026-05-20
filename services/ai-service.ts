/**
 * SalonPilot — AI Service
 * Interface unificada para providers de IA.
 *
 * Arquitetura (decisão definitiva):
 *   - OpenAI é o CÉREBRO ESTRATÉGICO do produto. Provider primário.
 *   - Demais providers (gemini, groq, openrouter, mock) são fallback.
 *
 * Modelos sugeridos:
 *   - gpt-4o            → raciocínio estratégico crítico (decisão de campanha, learning summary, plano diário)
 *   - gpt-4o-mini       → geração em volume (mensagem WhatsApp, classificação de cliente)
 *
 * Toda chamada deve ir via context-builder para garantir contexto COMPRIMIDO.
 * NUNCA mandar histórico bruto.
 */

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  /** Override model. If omitted uses env AI_MODEL. Use `tier` to pick from preset roles. */
  model?: string;
  /** Convenience: 'strategic' uses gpt-4o-class for reasoning, 'fast' uses gpt-4o-mini-class for generation. */
  tier?: 'strategic' | 'fast';
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokens?: { prompt: number; completion: number };
}

/** Per-provider model resolution. Each provider picks its own family by tier. */
export function pickModelFor(provider: string, req: AIRequest): string {
  if (req.model) return req.model; // explicit override (assumes caller knows the family)
  const tier = req.tier ?? 'fast';
  switch (provider) {
    case 'openai':
      if (tier === 'strategic') return process.env.OPENAI_MODEL_STRATEGIC || 'gpt-4o';
      return process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini';
    case 'gemini':
      if (tier === 'strategic') return process.env.GEMINI_MODEL_STRATEGIC || 'gemini-2.5-pro';
      return process.env.GEMINI_MODEL_FAST || 'gemini-2.5-flash';
    case 'groq':
      return process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    case 'openrouter':
      return process.env.OPENROUTER_MODEL || 'openrouter/auto';
    default:
      return 'mock-v1';
  }
}

// ── Mock Provider ──────────────────────────────────────────
const MOCK_RESPONSES: Record<string, string> = {
  reactivation_strategist: JSON.stringify({
    strategy_name: "Reativação Emocional 35-45d",
    hypothesis: "Salão tem retenção média e gargalo no pós-atendimento — clientes regulares ficam ~40d sem contato e esfriam. Memória estratégica diz que mensagens emocionais superam desconto neste perfil.",
    audience_logic: "Inativas há 35-45d com 2-3+ visitas e ticket médio ≥ R$80 — perfil que já demonstrou afinidade.",
    offer_type: "relacionamento",
    offer_description: "Aplicação de óleo capilar grátis no próximo agendamento de escova/hidratação (cortesia, não desconto).",
    message_template: "Oi, {{nome}} 💛 Senti sua falta por aqui! Reservei uma cortesia especial pra te receber essa semana — me responde aqui que te conto os detalhes.",
    tone: "acolhedor, próximo, levemente exclusivo",
    expected_response_rate: 0.42,
    expected_booking_rate: 0.28,
    expected_revenue: 720,
    confidence: 0.7,
    assumptions: [
      "Memória diz que campanhas emocionais > desconto neste salão",
      "Clientes 35-45d ainda têm boa chance de retorno (vs 90+d)",
      "WhatsApp é o canal mais forte"
    ],
    next_recommendation: "Se booking_rate < 0.2, testar oferta com brinde mais tangível (mini-produto) ao invés de cortesia de serviço."
  }),
  coach: JSON.stringify({
    diagnosis: "Você tem 12 clientes que não aparecem há mais de 45 dias.",
    reason: "Clientes que passam mais de 45 dias sem visita têm 68% de chance de nunca mais voltar se não forem contactadas.",
    action: "Crie uma campanha de reativação hoje com uma condição especial para essas clientes voltarem.",
    message: "Oi, {{nome}}! 💕 A gente sentiu sua falta por aqui. Essa semana estamos com uma condição especial para você voltar a se cuidar. Posso te mostrar os horários disponíveis?",
    metric: "Acompanhe: quantas responderam e quantas agendaram nos próximos 7 dias."
  }),
  learning_synthesis: JSON.stringify({
    ai_learning_summary: "Campanha de reativação emocional com cortesia (não desconto) converteu acima do esperado para clientes 35-45d com histórico de visitas. Confirma padrão de que público responde melhor a relacionamento que a oferta agressiva.",
    next_recommendation: "Replicar abordagem com clientes 25-35d para reduzir churn antes de chegar em 45d.",
    intelligence_notes: [
      {
        note_type: "pattern",
        title: "Cortesia > desconto neste salão",
        content: "Cortesia de serviço (óleo capilar grátis) gerou 28% de booking em clientes regulares sumidas. Reforça hipótese de relacionamento.",
        confidence: 0.78
      },
      {
        note_type: "opportunity",
        title: "Janela 35-45d é o sweet spot de reativação",
        content: "Clientes nessa faixa ainda lembram do salão. Acima de 60d cai pela metade. Atacar essa janela proativamente.",
        confidence: 0.7
      }
    ],
    key_signals: ["booking_rate=28%", "vs_expected=+12pp", "channel=whatsapp"]
  }),
  campaign: JSON.stringify({
    name: "Campanha de Reativação",
    objective: "reativacao",
    message: "Oi, {{nome}}! 💕 A gente sentiu sua falta por aqui. Essa semana estamos com uma condição especial para você voltar a se cuidar. Posso te mostrar os horários disponíveis?",
    estimated_reach: 12,
    estimated_response_rate: "35%",
    estimated_revenue: "R$ 420"
  }),
  message: "Oi, {{nome}}! Tudo bem? 😊 Passando para te lembrar que já faz um tempinho desde a sua última visita. Que tal agendarmos um horário especial para você se cuidar? Temos ótimas novidades te esperando! 💅",
  content: JSON.stringify({
    type: "story",
    title: "Antes & Depois — Transformação do Dia",
    content: "✨ Quando a arte fala por si mesma...\n\nEssa transformação incrível foi feita aqui no nosso studio! 💕\n\nQuer ser a próxima? Me chama no WhatsApp! 👇\n\n📍 {cidade}\n📲 {whatsapp}\n\n#cabelo #beleza #transformacao #salao",
    objective: "atrair_novas_clientes"
  }),
  recommendation: JSON.stringify([
    {
      type: "retention",
      title: "Reative 12 clientes sumidas agora",
      description: "Você tem 12 clientes que não aparecem há mais de 45 dias.",
      priority: "urgent",
      action: "Criar campanha de reativação"
    },
    {
      type: "ticket",
      title: "Venda mais combos — ticket médio baixo",
      description: "Seu ticket médio está em R$ 74. Com 3 combos/semana você chega a R$ 98.",
      priority: "high",
      action: "Criar oferta de combo manicure + pedicure"
    }
  ])
};

async function callMock(req: AIRequest): Promise<AIResponse> {
  await new Promise(r => setTimeout(r, 300)); // simulate latency

  // Match by distinctive system-prompt fragments first (more reliable than user prompt)
  let content = MOCK_RESPONSES.coach;
  const sysLower = req.systemPrompt.toLowerCase();
  const promptLower = (req.systemPrompt + req.userPrompt).toLowerCase();

  if (sysLower.includes('reativar clientes que sumiram') || sysLower.includes('reactivation_strategist') || sysLower.includes('reativar clientes')) {
    content = MOCK_RESPONSES.reactivation_strategist;
  } else if (sysLower.includes('learning layer') || sysLower.includes('aprendizado')) {
    content = MOCK_RESPONSES.learning_synthesis;
  } else if (promptLower.includes('campanha') || promptLower.includes('campaign')) {
    content = MOCK_RESPONSES.campaign;
  } else if (promptLower.includes('mensagem') || promptLower.includes('message')) {
    content = MOCK_RESPONSES.message;
  } else if (promptLower.includes('conteúdo') || promptLower.includes('instagram') || promptLower.includes('content')) {
    content = MOCK_RESPONSES.content;
  } else if (promptLower.includes('recomend')) {
    content = MOCK_RESPONSES.recommendation;
  }

  return {
    content,
    provider: 'mock',
    model: 'mock-v1',
    tokens: { prompt: 500, completion: 200 }
  };
}

// ── Gemini Provider ────────────────────────────────────────
async function callGemini(req: AIRequest, attempt = 1): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = pickModelFor('gemini', req);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = {
    temperature: req.temperature ?? 0.7,
    maxOutputTokens: req.maxTokens ?? 1500,
  };

  if (req.jsonSchema) {
    generationConfig.responseMimeType = 'application/json';
  }

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: req.systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: req.userPrompt }]
      }
    ],
    generationConfig,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Rate limit or unavailable — retry with exponential backoff (max 3 attempts)
  if ((res.status === 429 || res.status === 503) && attempt <= 3) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '10');
    const waitMs = Math.min(retryAfter * 1000, attempt * 10000);
    console.warn(`[Gemini] ${res.status} error. Retry ${attempt}/3 after ${waitMs}ms`);
    await new Promise(r => setTimeout(r, waitMs));
    return callGemini(req, attempt + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Gemini 2.5 thinking models may include <thinking>...</thinking> blocks — strip them
  raw = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

  return {
    content: raw,
    provider: 'gemini',
    model,
    tokens: {
      prompt: data.usageMetadata?.promptTokenCount ?? 0,
      completion: data.usageMetadata?.candidatesTokenCount ?? 0,
    }
  };
}

// ── Groq Provider ──────────────────────────────────────────
async function callGroq(req: AIRequest): Promise<AIResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const model = pickModelFor('groq', req);
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [
    { role: 'system', content: req.systemPrompt },
    { role: 'user', content: req.userPrompt }
  ];

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? 1024,
  };

  if (req.jsonSchema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    provider: 'groq',
    model,
    tokens: {
      prompt: data.usage?.prompt_tokens ?? 0,
      completion: data.usage?.completion_tokens ?? 0,
    }
  };
}

// ── OpenRouter Provider ────────────────────────────────────
async function callOpenRouter(req: AIRequest): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const model = pickModelFor('openrouter', req);
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const messages = [
    { role: 'system', content: req.systemPrompt },
    { role: 'user', content: req.userPrompt }
  ];

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? 1024,
  };

  if (req.jsonSchema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://beautygrowth.com.br',
      'X-Title': 'BeautyGrowth OS',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    provider: 'openrouter',
    model,
    tokens: {
      prompt: data.usage?.prompt_tokens ?? 0,
      completion: data.usage?.completion_tokens ?? 0,
    }
  };
}

// ── OpenAI Provider (cérebro estratégico — primário) ──────
async function callOpenAI(req: AIRequest): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const model = pickModelFor('openai', req);
  const url = 'https://api.openai.com/v1/chat/completions';

  const messages = [
    { role: 'system', content: req.systemPrompt },
    { role: 'user', content: req.userPrompt }
  ];

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: req.temperature ?? 0.6,
    max_tokens: req.maxTokens ?? 1500,
  };

  if (req.jsonSchema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    provider: 'openai',
    model,
    tokens: {
      prompt: data.usage?.prompt_tokens ?? 0,
      completion: data.usage?.completion_tokens ?? 0,
    }
  };
}

// ── Main AI Service ────────────────────────────────────────
async function dispatch(provider: string, req: AIRequest): Promise<AIResponse> {
  switch (provider) {
    case 'openai': return callOpenAI(req);
    case 'gemini': return callGemini(req);
    case 'groq': return callGroq(req);
    case 'openrouter': return callOpenRouter(req);
    case 'mock':
    default: return callMock(req);
  }
}

export async function generateAI(req: AIRequest): Promise<AIResponse> {
  const provider = process.env.AI_PROVIDER || 'openai';

  try {
    return await dispatch(provider, req);
  } catch (error) {
    const fallback = process.env.AI_FALLBACK_PROVIDER || 'gemini';
    console.error(`[AI] Primary provider ${provider} failed, falling back to ${fallback}:`, error);

    if (fallback === provider) {
      // avoid infinite loop — go straight to mock
      return callMock(req);
    }

    try {
      return await dispatch(fallback, req);
    } catch (err2) {
      console.error(`[AI] Fallback provider ${fallback} also failed:`, err2);
      return callMock(req);
    }
  }
}

// ── Convenience: Parse JSON response ──────────────────────
export function parseAIJson<T>(response: AIResponse): T {
  try {
    return JSON.parse(response.content) as T;
  } catch {
    // Try to extract JSON from markdown code block
    const match = response.content.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
    if (match) {
      return JSON.parse(match[1]) as T;
    }
    throw new Error('AI response is not valid JSON');
  }
}

type SupabaseClient = any;
import crypto from "crypto";

type MusicInput = {
  companyName: string;
  niche: string;
  style: string;
  tone: string;
};

type MusicResult = {
  lyrics: string;
  shortVersion: string;
  slogan: string;
  altVersion: string;
  tokensUsed: number;
  fromCache: boolean;
};

/**
 * Generate (or retrieve cached) jingle for a company.
 * Abstracts AI provider so it can be swapped later.
 */
export async function generateMusic(
  supabase: SupabaseClient,
  input: MusicInput
): Promise<MusicResult> {
  // 1. Build cache key
  const hashInput = `${input.companyName.toLowerCase().trim()}:${input.niche.toLowerCase().trim()}:${input.style.toLowerCase().trim()}:${input.tone.toLowerCase().trim()}`;
  const hashKey = crypto.createHash("md5").update(hashInput).digest("hex");

  // 2. Check ai_music_cache
  const { data: cached } = await supabase
    .from("ai_music_cache")
    .select("*")
    .eq("hash_key", hashKey)
    .single();

  if (cached) {
    return {
      lyrics: cached.lyrics || "",
      shortVersion: cached.short_version || "",
      slogan: cached.slogan || "",
      altVersion: cached.alt_version || "",
      tokensUsed: 0,
      fromCache: true,
    };
  }

  // 3. Build prompt
  const prompt = `Crie um jingle comercial para uma empresa local.

Nome da empresa: ${input.companyName}
Nicho: ${input.niche}
Estilo musical: ${input.style}
Tom: ${input.tone}

Entregar exatamente neste formato (use os titulos em caps como separadores):

LETRA COMPLETA:
(letra do jingle completa, 4-6 estrofes)

VERSAO 15 SEGUNDOS:
(versao resumida para spots de 15 segundos)

SLOGAN REPETITIVO:
(frase curta e memoravel para repetir)

VERSAO ALTERNATIVA:
(mesma mensagem em outro estilo musical diferente do principal)`;

  let lyrics = "";
  let shortVersion = "";
  let slogan = "";
  let altVersion = "";
  let tokensUsed = 0;

  // 4. Call AI
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.9 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const sections = fullText.split(/LETRA COMPLETA:|VERSAO 15 SEGUNDOS:|SLOGAN REPETITIVO:|VERSAO ALTERNATIVA:/i);
        lyrics = (sections[1] || "").trim();
        shortVersion = (sections[2] || "").trim();
        slogan = (sections[3] || "").trim();
        altVersion = (sections[4] || "").trim();
        tokensUsed =
          data.usageMetadata?.totalTokenCount ||
          Math.ceil((prompt.length + fullText.length) / 4);
      }
    } catch {
      // Fall through to template
    }
  }

  // 5. Fallback template
  if (!lyrics) {
    lyrics = `${input.companyName}, ${input.companyName}!\nO melhor do ${input.niche.toLowerCase()} esta aqui\nQualidade e confianca\nVenha nos conhecer!\n\n(Refrao)\n${input.companyName} e show\n${input.companyName} e demais\nVem pra ca, vem curtir\nO melhor que voce vai encontrar!\n\nAtendimento especial\nPreco justo e sem igual\n${input.companyName} te espera\nVem ser nosso cliente fiel!`;
    shortVersion = `${input.companyName}! O melhor do ${input.niche.toLowerCase()}. Qualidade, confianca e precos incriveis. Venha nos visitar!`;
    slogan = `${input.companyName} - O melhor do ${input.niche.toLowerCase()} pra voce!`;
    altVersion = `(Versao Sertanejo)\nNo coracao da cidade, tem um lugar especial\n${input.companyName} te recebe, de um jeito sem igual\nVem de bota, vem de tenis, vem do jeito que quiser\nO ${input.niche.toLowerCase()} mais querido, e aqui que voce vai ter!`;
    tokensUsed = 200;
  }

  // 6. Save to cache
  await supabase.from("ai_music_cache").upsert(
    {
      hash_key: hashKey,
      lyrics,
      short_version: shortVersion,
      slogan,
      alt_version: altVersion,
    },
    { onConflict: "hash_key" }
  );

  return { lyrics, shortVersion, slogan, altVersion, tokensUsed, fromCache: false };
}

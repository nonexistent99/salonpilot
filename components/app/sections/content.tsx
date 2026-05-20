"use client";

import { useState } from "react";

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
import { Instagram, Sparkles, Image, Film, Type, Copy, CheckCircle2, Loader2, Download, Tag } from "lucide-react";

const CONTENT_TYPES = [
  { value: "story", label: "Story", icon: Image, desc: "Conteúdo vertical para Stories" },
  { value: "post", label: "Post", icon: Image, desc: "Post para o feed do Instagram" },
  { value: "reel", label: "Reels", icon: Film, desc: "Roteiro para vídeo curto" },
  { value: "caption", label: "Legenda", icon: Type, desc: "Legenda para sua foto" },
  { value: "offer", label: "Oferta", icon: Tag, desc: "Oferta com urgência" },
];

const OBJECTIVES = [
  "Atrair novas clientes",
  "Reativar clientes sumidas",
  "Promover serviço específico",
  "Mostrar autoridade",
  "Preencher agenda vazia",
  "Aumentar seguidores",
];

type ContentItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  hashtags?: string[];
  tip?: string;
  approved: boolean;
};

export function ContentSection() {
  const [contentType, setContentType] = useState("story");
  const [objective, setObjective] = useState("");
  const [generating, setGenerating] = useState(false);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generateContent = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "content",
          question: `Gere um ${contentType} para Instagram com objetivo: ${objective || "atrair mais clientes"}`,
        }),
      });
      const data = await res.json();
      const response = data.response;

      let parsed: ContentItem;
      try {
        const p = typeof response === "string" ? JSON.parse(response) : response;
        parsed = {
          id: genId(),
          type: p.type || contentType,
          title: p.title || `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} — ${objective || "Geral"}`,
          content: p.content || p.action || String(p),
          hashtags: p.hashtags || [],
          tip: p.tip,
          approved: false,
        };
      } catch {
        parsed = {
          id: genId(),
          type: contentType,
          title: `Conteúdo gerado`,
          content: typeof response === "string" ? response : response?.action || "Conteúdo gerado pela IA",
          approved: false,
        };
      }

      setContents(prev => [parsed, ...prev]);
    } finally {
      setGenerating(false);
    }
  };

  const copyContent = async (item: ContentItem) => {
    const text = `${item.content}${item.hashtags?.length ? "\n\n" + item.hashtags.join(" ") : ""}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleApprove = (id: string) => {
    setContents(prev => prev.map(c => c.id === id ? { ...c, approved: !c.approved } : c));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Conteúdo para Instagram
        </h1>
        <p className="text-sm text-muted-foreground">Gere posts, Stories e Reels com IA</p>
      </div>

      {/* Generator */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Gerar novo conteúdo</h2>
        <div className="space-y-4">
          {/* Type selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipo de conteúdo</label>
            <div className="flex gap-2 flex-wrap">
              {CONTENT_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setContentType(t.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      contentType === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/30 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Objetivo</label>
            <div className="flex gap-2 flex-wrap">
              {OBJECTIVES.map(obj => (
                <button
                  key={obj}
                  onClick={() => setObjective(obj === objective ? "" : obj)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    objective === obj
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  {obj}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateContent}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 glow-ai"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Gerar com IA</>
            )}
          </button>
        </div>
      </div>

      {/* Generated contents */}
      {contents.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Conteúdos gerados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contents.map(item => (
              <div
                key={item.id}
                className={`metric-card ${item.approved ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{item.type}</span>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  </div>
                  {item.approved && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                    </span>
                  )}
                </div>

                <div className="bg-muted/50 rounded-xl p-4 mb-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.content}</p>
                  {item.hashtags && item.hashtags.length > 0 && (
                    <p className="text-xs text-primary mt-2">{item.hashtags.join(" ")}</p>
                  )}
                </div>

                {item.tip && (
                  <p className="text-xs text-muted-foreground italic mb-3">💡 {item.tip}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyContent(item)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    {copiedId === item.id ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Copiado!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copiar</>
                    )}
                  </button>
                  <button
                    onClick={() => toggleApprove(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      item.approved
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:border-primary/30"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.approved ? "Aprovado" : "Aprovar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contents.length === 0 && !generating && (
        <div className="glass-card rounded-xl p-16 text-center">
          <Instagram className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-medium text-muted-foreground">Nenhum conteúdo gerado ainda</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Selecione o tipo e clique em "Gerar com IA"</p>
        </div>
      )}
    </div>
  );
}

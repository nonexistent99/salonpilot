"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { Instagram, Sparkles, Image, Film, Type, Copy, CheckCircle2, Loader2, Archive, Tag, PanelsTopLeft } from "lucide-react";

const CONTENT_TYPES = [
  { value: "story", label: "Story", icon: Image },
  { value: "post", label: "Post", icon: Image },
  { value: "reel", label: "Reels", icon: Film },
  { value: "caption", label: "Legenda", icon: Type },
  { value: "offer", label: "Oferta", icon: Tag },
  { value: "carousel", label: "Carrossel", icon: PanelsTopLeft },
];

const OBJECTIVES = [
  "Atrair novas clientes",
  "Reativar clientes sumidas",
  "Promover serviço específico",
  "Mostrar autoridade",
  "Preencher agenda vazia",
  "CTA para WhatsApp",
];

export function ContentSection() {
  const [contentType, setContentType] = useState("story");
  const [objective, setObjective] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data } = useSWR("/api/ai/content", fetcher);
  const contents = data?.contents || [];

  const generateContent = async () => {
    setGenerating(true);
    try {
      await fetch("/api/ai/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: contentType,
          objective: objective || "atrair mais clientes",
        }),
      });
      await mutate("/api/ai/content");
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/ai/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await mutate("/api/ai/content");
  };

  const copyContent = async (item: any) => {
    const hashtags = Array.isArray(item.hashtags) ? item.hashtags.join(" ") : "";
    await navigator.clipboard.writeText(`${item.content}${hashtags ? `\n\n${hashtags}` : ""}`);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Conteúdo para Instagram
        </h1>
        <p className="text-sm text-muted-foreground">Gere, aprove e reutilize conteúdos com histórico salvo</p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Gerar novo conteúdo</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {CONTENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setContentType(type.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      contentType === type.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/30 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Objetivo</label>
            <div className="flex gap-2 flex-wrap">
              {OBJECTIVES.map((item) => (
                <button
                  key={item}
                  onClick={() => setObjective(item === objective ? "" : item)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    objective === item
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateContent}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar com IA</>}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-foreground">Histórico</h2>
        {contents.length === 0 ? (
          <div className="glass-card rounded-xl p-14 text-center">
            <Instagram className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">Nenhum conteúdo salvo ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contents.map((item: any) => (
              <div key={item.id} className={`metric-card ${item.status === "approved" ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{item.type}</span>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.objective || "sem objetivo"} · {item.status}</p>
                  </div>
                  {item.status === "approved" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{item.content}</p>
                  {Array.isArray(item.hashtags) && item.hashtags.length > 0 && (
                    <p className="text-xs text-primary mt-2">{item.hashtags.join(" ")}</p>
                  )}
                </div>

                {item.visual_brief && <p className="text-xs text-muted-foreground mb-2">Visual: {item.visual_brief}</p>}
                {item.tip && <p className="text-xs text-muted-foreground mb-3">Dica: {item.tip}</p>}

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => copyContent(item)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    {copiedId === item.id ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, item.status === "approved" ? "draft" : "approved")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.status === "approved" ? "Voltar para rascunho" : "Aprovar"}
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, "archived")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Arquivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

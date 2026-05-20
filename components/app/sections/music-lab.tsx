"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Music,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

interface MusicProject {
  id: string;
  company_name: string;
  niche: string;
  style: string;
  tone: string;
  lyrics: string;
  short_version: string;
  slogan: string;
  alt_version: string;
  created_at: string;
}

const styles = [
  "Pop",
  "Sertanejo",
  "Funk",
  "Forro",
  "Pagode",
  "Rock",
  "MPB",
  "Reggae",
  "Eletronica",
  "Hip Hop",
];

const tones = [
  "Animado",
  "Profissional",
  "Divertido",
  "Emocional",
  "Energetico",
  "Calmo",
  "Inspirador",
];

export function MusicLabSection() {
  const [companyName, setCompanyName] = useState("");
  const [niche, setNiche] = useState("");
  const [style, setStyle] = useState("Pop");
  const [tone, setTone] = useState("Animado");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: musicData, isLoading } = useSWR<{
    projects: MusicProject[];
  }>("/api/music", fetcher);
  const projects = musicData?.projects || [];

  const handleGenerate = async () => {
    if (!companyName || !niche) {
      setError("Preencha o nome da empresa e o nicho.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          niche,
          style: style.toLowerCase(),
          tone: tone.toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao gerar jingle");
        return;
      }

  // Revalidate list + credits
  mutate("/api/music");
  mutate("/api/dashboard");
  mutate("/api/billing/credits");

      // Clear form
      setCompanyName("");
      setNiche("");

      // Expand the newly created project
      if (data.project?.id) {
        setExpandedId(data.project.id);
      }
    } catch {
      setError("Falha na conexao com o servidor");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      {/* Generator form */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Criar Jingle Comercial
          </h3>
          <span className="ml-auto text-xs text-muted-foreground bg-chart-2/10 text-chart-2 px-2 py-0.5 rounded-md">
            MVP - Apenas letra
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Nome da empresa
            </label>
            <input
              type="text"
              placeholder="Ex: Padaria do Ze"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-10 px-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Nicho
            </label>
            <input
              type="text"
              placeholder="Ex: Padaria, Restaurante, Salao"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full h-10 px-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Estilo musical
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {styles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Tom
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {tones.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando jingle...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar Jingle
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Fechar
          </button>
        </motion.div>
      )}

      {/* Projects list */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Seus Jingles ({projects.length})
        </h3>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Nenhum jingle criado
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crie seu primeiro jingle comercial preenchendo o formulario acima
            </p>
          </div>
        )}

        <AnimatePresence>
          {projects.map((project, index) => {
            const isExpanded = expandedId === project.id;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : project.id)
                  }
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {project.company_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {project.niche} - {project.style} / {project.tone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border pt-4">
                        {/* Slogan */}
                        <MusicBlock
                          label="Slogan Repetitivo"
                          text={project.slogan}
                          field={`slogan-${project.id}`}
                          copiedField={copiedField}
                          onCopy={handleCopy}
                          accent
                        />

                        {/* Lyrics */}
                        <MusicBlock
                          label="Letra Completa"
                          text={project.lyrics}
                          field={`lyrics-${project.id}`}
                          copiedField={copiedField}
                          onCopy={handleCopy}
                        />

                        {/* Short version */}
                        <MusicBlock
                          label="Versao 15 Segundos"
                          text={project.short_version}
                          field={`short-${project.id}`}
                          copiedField={copiedField}
                          onCopy={handleCopy}
                        />

                        {/* Alt version */}
                        <MusicBlock
                          label="Versao Alternativa"
                          text={project.alt_version}
                          field={`alt-${project.id}`}
                          copiedField={copiedField}
                          onCopy={handleCopy}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MusicBlock({
  label,
  text,
  field,
  copiedField,
  onCopy,
  accent,
}: {
  label: string;
  text: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
  accent?: boolean;
}) {
  if (!text) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <button
          onClick={() => onCopy(text, field)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {copiedField === field ? (
            <CheckCircle2 className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copiedField === field ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <pre
        className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg border font-sans",
          accent
            ? "bg-primary/5 border-primary/10 text-primary font-semibold text-base"
            : "bg-secondary/30 border-border text-foreground"
        )}
      >
        {text}
      </pre>
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { mutate } from "swr";
import type { Lead } from "@/app/page";
import {
  X,
  Star,
  Globe,
  Phone,
  CalendarPlus,
  MessageCircle,
  Target,
  Loader2,
  CheckCircle2,
  Zap,
  MapPin,
  Copy,
  ExternalLink,
  Brain,
  Clock,
  Shield,
  Lightbulb,
} from "lucide-react";

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
}

export function LeadDetailPanel({ lead, onClose }: LeadDetailPanelProps) {
  const [currentLead, setCurrentLead] = useState(lead);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduled, setScheduled] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    setScheduling(true);
    try {
      await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: currentLead.id,
          scheduled_at: `${scheduleDate}T${scheduleTime}:00`,
          status: "scheduled",
        }),
      });
      mutate((key: string) =>
        typeof key === "string" && key.startsWith("/api/meetings")
      );
      mutate("/api/dashboard");
      setScheduled(true);
      setTimeout(() => setScheduled(false), 3000);
    } finally {
      setScheduling(false);
    }
  };

  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    setScriptError(null);
    try {
      const res = await fetch(
        `/api/leads/${currentLead.id}/generate-script`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        setScriptError(data.error || "Erro ao gerar script");
        return;
      }

      setCurrentLead((prev) => ({ ...prev, script: data.script }));
      mutate("/api/leads");
      mutate("/api/billing/credits");
    } catch {
      setScriptError("Falha na conexao");
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleCopyScript = () => {
    if (currentLead.script) {
      navigator.clipboard.writeText(currentLead.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error || "Erro ao analisar");
        return;
      }
      setAnalysis(data.analysis);
      if (data.analysis?.opportunity_score) {
        setCurrentLead((prev) => ({ ...prev, opportunity_score: data.analysis.opportunity_score, score_ia: data.analysis.opportunity_score }));
      }
      mutate("/api/leads");
      mutate("/api/dashboard");
      mutate("/api/billing/credits");
    } catch {
      setAnalysisError("Falha na conexao");
    } finally {
      setAnalyzing(false);
    }
  };

  const score = currentLead.opportunity_score ?? currentLead.score_ia;
  const reviewsNum =
    currentLead.reviews_count ?? currentLead.reviews ?? 0;

  const whatsappUrl = currentLead.phone
    ? `https://wa.me/55${currentLead.phone.replace(/\D/g, "")}`
    : "#";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 z-50 h-screen w-full max-w-lg border-l border-border bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">
            {currentLead.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentLead.niche} - {currentLead.city}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              <span className="text-sm font-semibold text-foreground">
                {currentLead.rating}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {reviewsNum} avaliacoes
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {score}/100
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Score de oportunidade
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Contato
          </h4>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              {currentLead.phone || "Sem telefone"}
            </div>
            {currentLead.address && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{currentLead.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              {currentLead.website ? (
                <a
                  href={currentLead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 truncate"
                >
                  {currentLead.website.replace(/^https?:\/\//, "").slice(0, 40)}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-destructive">Sem site</span>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pipeline
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: "new", label: "Novo", style: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
                { key: "contacted", label: "Contatado", style: "bg-warning/10 text-warning border-warning/20" },
                { key: "meeting_scheduled", label: "Reuniao", style: "bg-primary/10 text-primary border-primary/20" },
                { key: "proposal_sent", label: "Proposta", style: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
                { key: "closed_won", label: "Fechado", style: "bg-chart-1/10 text-chart-1 border-chart-1/20" },
                { key: "closed_lost", label: "Perdido", style: "bg-destructive/10 text-destructive border-destructive/20" },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                onClick={async () => {
                  const body: Record<string, unknown> = { status: s.key };
                  if (s.key === "closed_won") {
                    const val = prompt("Valor do negocio fechado (R$):");
                    if (val) body.deal_value = Number(val);
                  }
                  const res = await fetch(`/api/leads/${currentLead.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setCurrentLead((prev) => ({ ...prev, status: updated.status }));
                    mutate("/api/leads");
                    mutate("/api/dashboard");
                  }
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                  currentLead.status === s.key
                    ? s.style
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/60"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Script Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Script de Abordagem (IA)
            </h4>
            {currentLead.script && (
              <button
                onClick={handleCopyScript}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copied ? (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copiado!" : "Copiar"}
              </button>
            )}
          </div>

          {currentLead.script ? (
            <p className="text-sm text-foreground leading-relaxed p-3 rounded-lg bg-primary/5 border border-primary/10">
              {currentLead.script}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerateScript}
                disabled={generatingScript}
                className="h-10 rounded-lg bg-chart-2/10 text-chart-2 border border-chart-2/20 text-sm font-medium hover:bg-chart-2/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingScript ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando script com IA...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Gerar Script de Abordagem
                  </>
                )}
              </button>
              {scriptError && (
                <p className="text-xs text-destructive">{scriptError}</p>
              )}
            </div>
          )}
        </div>

        {/* Premium Analysis (Layer 2) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Analise Premium (5 creditos)
            </h4>
          </div>

          {analysis ? (
            <div className="flex flex-col gap-2.5">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Score: {analysis.opportunity_score as number}/100</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-semibold text-foreground">Fraqueza de Marketing</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{analysis.marketing_weakness as string}</p>
              </div>
              <div className="p-3 rounded-lg bg-chart-2/5 border border-chart-2/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-chart-2" />
                  <span className="text-xs font-semibold text-foreground">Estrategia de Oferta</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{analysis.offer_strategy as string}</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/5 border border-warning/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <span className="text-xs font-semibold text-foreground">Melhor Horario</span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.best_contact_time as string}</p>
              </div>
              {analysis.cold_call_script && (
                <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs font-semibold text-foreground">Script de Ligacao</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{analysis.cold_call_script as string}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Analisar Empresa
                  </>
                )}
              </button>
              {analysisError && (
                <p className="text-xs text-destructive">{analysisError}</p>
              )}
            </div>
          )}
        </div>

        {/* Schedule meeting */}
        <div className="flex flex-col gap-3 p-4 rounded-lg bg-secondary/30 border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agendar Reuniao
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="h-9 px-3 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="h-9 px-3 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={handleSchedule}
            disabled={scheduling || !scheduleDate}
            className="h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {scheduling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : scheduled ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Agendado!
              </>
            ) : (
              <>
                <CalendarPlus className="w-4 h-4" />
                Agendar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-border flex items-center gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 h-10 rounded-lg bg-success/10 text-success text-sm font-medium hover:bg-success/20 transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </a>
        {currentLead.phone && (
          <a
            href={`tel:${currentLead.phone}`}
            className="h-10 w-10 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

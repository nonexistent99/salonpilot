"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Section } from "@/app/page";
import {
  Brain, TrendingUp, AlertTriangle, Zap, Target, Lightbulb,
  BarChart3, RefreshCw, ChevronRight, Sparkles, Activity,
  Users, Shield, ShoppingBag, Calendar, Wifi, CheckSquare,
  ArrowUpRight, Trophy
} from "lucide-react";

interface GrowthHealthBreakdown {
  acquisition: number;
  retention: number;
  ticket_upsell: number;
  agenda: number;
  attendance: number;
  digital_presence: number;
  execution: number;
  total: number;
  main_bottleneck: string;
  best_opportunity: string;
  recommended_action: string;
}

interface IntelligenceDashboardProps {
  onSectionChange?: (section: Section) => void;
}

const DIMENSION_CONFIG = [
  { key: "acquisition", label: "Aquisição", max: 20, icon: Users, color: "text-violet-500", bar: "bg-violet-500" },
  { key: "retention", label: "Retenção", max: 20, icon: Shield, color: "text-emerald-500", bar: "bg-emerald-500" },
  { key: "ticket_upsell", label: "Ticket / Upsell", max: 15, icon: ShoppingBag, color: "text-amber-500", bar: "bg-amber-500" },
  { key: "agenda", label: "Agenda / Ocupação", max: 15, icon: Calendar, color: "text-blue-500", bar: "bg-blue-500" },
  { key: "attendance", label: "Atendimento / Resposta", max: 10, icon: Activity, color: "text-pink-500", bar: "bg-pink-500" },
  { key: "digital_presence", label: "Presença Digital", max: 10, icon: Wifi, color: "text-cyan-500", bar: "bg-cyan-500" },
  { key: "execution", label: "Execução das Ações", max: 10, icon: CheckSquare, color: "text-orange-500", bar: "bg-orange-500" },
];

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" width="128" height="128">
        <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(0.92 0.01 55)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-3xl font-black" style={{ color }}>{Math.round(score)}</p>
        <p className="text-[10px] text-muted-foreground font-medium">/ 100</p>
      </div>
    </div>
  );
}

function ScoreLabel({ score }: { score: number }) {
  if (score >= 70) return <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Saudável 🌱</span>;
  if (score >= 45) return <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Em desenvolvimento ⚡</span>;
  return <span className="text-xs font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">Atenção necessária 🚨</span>;
}

export function IntelligenceDashboard({ onSectionChange }: IntelligenceDashboardProps) {
  const { data, isLoading, mutate } = useSWR("/api/intelligence/dashboard", fetcher, {
    refreshInterval: 120000,
  });
  const [generating, setGenerating] = useState(false);
  const [decision, setDecision] = useState<Record<string, unknown> | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);

  const health: GrowthHealthBreakdown | null = data?.health_score ?? null;
  const insights: Array<Record<string, string>> = data?.kpi_insights ?? [];
  const notes: Array<Record<string, string>> = data?.intelligence_notes ?? [];
  const latestReport = data?.latest_report ?? null;

  const generateReport = async () => {
    setGenerating(true);
    try {
      await fetch("/api/intelligence/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "weekly" }),
      });
      mutate();
    } finally {
      setGenerating(false);
    }
  };

  const generateDecision = async () => {
    setLoadingDecision(true);
    try {
      const res = await fetch("/api/intelligence/decision", { method: "POST" });
      const json = await res.json();
      setDecision(json.decision);
    } finally {
      setLoadingDecision(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-xl w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-violet-600" />
            Growth Intelligence
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Diagnóstico estratégico em tempo real do seu salão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Gerando..." : "Relatório semanal"}
          </button>
          <button
            onClick={generateDecision}
            disabled={loadingDecision}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingDecision ? "animate-spin" : ""}`} />
            {loadingDecision ? "Pensando..." : "Decisão estratégica"}
          </button>
        </div>
      </div>

      {/* Top grid: Health Score + Insights + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Growth Health Score */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="font-semibold text-foreground">Índice de Crescimento</h2>
          </div>

          {health ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <ScoreRing score={health.total} />
                <ScoreLabel score={health.total} />
              </div>

              <div className="space-y-2">
                {DIMENSION_CONFIG.map(({ key, label, max, icon: Icon, color, bar }) => {
                  const val = health[key as keyof GrowthHealthBreakdown] as number ?? 0;
                  const pct = (val / max) * 100;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3 h-3 ${color}`} />
                          <span className="text-xs text-muted-foreground">{label}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{val.toFixed(1)}/{max}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${bar} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Sem dados de KPI ainda</p>
              <button onClick={() => mutate()} className="text-xs text-primary font-medium mt-2 hover:underline">
                Calcular agora
              </button>
            </div>
          )}
        </div>

        {/* Main bottleneck + Best opportunity */}
        <div className="space-y-4">
          {health && (
            <>
              <div className="glass-card rounded-xl p-5 border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-foreground">Maior Gargalo</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{health.main_bottleneck}</p>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                  <p className="text-xs text-red-700 font-medium">{health.recommended_action}</p>
                </div>
              </div>

              <div className="glass-card rounded-xl p-5 border-l-4 border-emerald-500">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-foreground">Melhor Oportunidade</span>
                </div>
                <p className="text-sm text-muted-foreground">{health.best_opportunity}</p>
              </div>
            </>
          )}

          {/* Intelligence Notes */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-foreground">Aprendizados Recentes</h3>
            </div>
            {notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-xs font-semibold text-foreground line-clamp-1">{note.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">Sem aprendizados ainda</p>
            )}
          </div>
        </div>

        {/* KPI Insights */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">KPI Insights</h2>
            </div>
          </div>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight) => {
                const riskColor = insight.risk_level === 'critical' ? 'text-red-600 bg-red-500/8 border-red-500/15' :
                  insight.risk_level === 'high' ? 'text-orange-600 bg-orange-500/8 border-orange-500/15' :
                    insight.risk_level === 'medium' ? 'text-amber-600 bg-amber-500/8 border-amber-500/15' :
                      'text-muted-foreground bg-muted/30 border-border';
                return (
                  <div key={insight.id} className={`p-3 rounded-xl border ${riskColor}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide">{insight.kpi_name}</span>
                      <span className="text-xs font-semibold">{insight.raw_value}</span>
                    </div>
                    <p className="text-xs leading-relaxed mb-2">{insight.interpretation}</p>
                    {insight.recommended_action && (
                      <p className="text-xs font-medium opacity-80">→ {insight.recommended_action}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Gere um relatório para ver os KPI insights</p>
            </div>
          )}
        </div>
      </div>

      {/* Strategic Decision */}
      {decision && (
        <div className="glass-card rounded-xl p-6 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-foreground">Decisão Estratégica da IA</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">DIAGNÓSTICO ATUAL</p>
              <p className="text-sm text-foreground">{String(decision.current_diagnosis)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">PRINCIPAL GARGALO</p>
              <p className="text-sm text-foreground">{String(decision.main_bottleneck)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">MELHOR OPORTUNIDADE</p>
              <p className="text-sm text-foreground">{String(decision.best_opportunity)}</p>
            </div>
            {Array.isArray(decision.action_plan) && decision.action_plan.length > 0 && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">PLANO DE AÇÃO</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {(decision.action_plan as string[]).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/50 dark:bg-black/20">
                      <div className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-xs text-foreground">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {typeof decision.learning_goal === "string" && decision.learning_goal && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">OBJETIVO DE APRENDIZADO</p>
                <p className="text-sm text-foreground italic">{String(decision.learning_goal)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Latest Report */}
      {latestReport && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-foreground">
                Último relatório — {latestReport.report_type === 'daily' ? 'Diário' : latestReport.report_type === 'weekly' ? 'Semanal' : 'Mensal'}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(latestReport.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestReport.summary && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">RESUMO</p>
                <p className="text-sm text-foreground">{latestReport.summary}</p>
              </div>
            )}
            {latestReport.main_bottleneck && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">GARGALO PRINCIPAL</p>
                <p className="text-sm text-foreground">{latestReport.main_bottleneck}</p>
              </div>
            )}
            {latestReport.best_opportunity && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">MELHOR OPORTUNIDADE</p>
                <p className="text-sm text-foreground">{latestReport.best_opportunity}</p>
              </div>
            )}
            {latestReport.what_worked && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">O QUE FUNCIONOU</p>
                <p className="text-sm text-foreground">{latestReport.what_worked}</p>
              </div>
            )}
          </div>
          {Array.isArray(latestReport.recommended_actions) && latestReport.recommended_actions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">AÇÕES RECOMENDADAS</p>
              <div className="flex flex-wrap gap-2">
                {(latestReport.recommended_actions as string[]).map((action: string, i: number) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15 text-primary font-medium">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Clientes em risco", icon: AlertTriangle, color: "text-red-500", onClick: () => onSectionChange?.("clients") },
          { label: "Criar campanha", icon: Target, color: "text-primary", onClick: () => onSectionChange?.("campaigns") },
          { label: "Relatório detalhado", icon: BarChart3, color: "text-blue-600", onClick: () => onSectionChange?.("reports") },
          { label: "Coach estratégico", icon: Brain, color: "text-violet-600", onClick: () => onSectionChange?.("ai-coach") },
        ].map(({ label, icon: Icon, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="glass-card rounded-xl p-4 flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
          >
            <Icon className={`w-5 h-5 ${color} shrink-0`} />
            <span className="text-sm font-medium text-foreground">{label}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

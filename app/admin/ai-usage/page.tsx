"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Loader2, Brain, Zap, Hash } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminAiUsagePage() {
  const { data, isLoading } = useSWR("/api/admin/ai-usage", fetcher, { refreshInterval: 30000 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const chartTooltipStyle = {
    contentStyle: {
      background: "oklch(0.11 0.01 240)",
      border: "1px solid oklch(0.2 0.01 240)",
      borderRadius: "8px",
      fontSize: "12px",
      color: "oklch(0.96 0 0)",
    },
  };

  const featureLabels: Record<string, string> = {
    generate_script: "Gerar Script",
    generate_music: "Gerar Jingle",
    analyze_lead: "Analisar Lead",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Uso de IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoramento do uso de Gemini AI na plataforma
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
            <Hash className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Chamadas no Mes</p>
            <p className="text-2xl font-bold text-foreground">{data.totalCalls}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-chart-2/10">
            <Brain className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tokens Usados</p>
            <p className="text-2xl font-bold text-foreground">
              {data.totalTokens.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/10">
            <Zap className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Creditos Consumidos</p>
            <p className="text-2xl font-bold text-foreground">{data.totalCredits}</p>
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Uso Diario (14 dias)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.dailyUsage}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.6 0.01 240)" }} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
            <Tooltip {...chartTooltipStyle} />
            <Line
              type="monotone"
              dataKey="tokens"
              name="Tokens"
              stroke="oklch(0.72 0.19 165)"
              strokeWidth={2}
              dot={{ fill: "oklch(0.72 0.19 165)", r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="credits"
              name="Creditos"
              stroke="oklch(0.78 0.16 80)"
              strokeWidth={2}
              dot={{ fill: "oklch(0.78 0.16 80)", r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* By feature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Uso por Feature</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={(data.featureBreakdown || []).map((f: { feature: string; count: number; tokens: number; credits: number }) => ({
                ...f,
                feature: featureLabels[f.feature] || f.feature,
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
              <YAxis dataKey="feature" type="category" tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} width={100} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="count" name="Chamadas" fill="oklch(0.72 0.19 165)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Detalhes por Feature</h3>
          <div className="flex flex-col gap-3">
            {(data.featureBreakdown || []).map(
              (f: { feature: string; count: number; tokens: number; credits: number }) => (
                <div
                  key={f.feature}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50"
                >
                  <span className="text-sm font-medium text-foreground">
                    {featureLabels[f.feature] || f.feature}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{f.count} chamadas</span>
                    <span>{f.tokens.toLocaleString("pt-BR")} tokens</span>
                    <span className="text-warning font-medium">{f.credits} cred.</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

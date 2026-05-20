"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Loader2, Coins, TrendingDown, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminCreditsPage() {
  const { data, isLoading } = useSWR("/api/admin/credits", fetcher, { refreshInterval: 30000 });

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Creditos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analitico de consumo de creditos na plataforma
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/10">
            <Coins className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usados Hoje</p>
            <p className="text-2xl font-bold text-foreground">{data.creditsToday}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usados no Mes</p>
            <p className="text-2xl font-bold text-foreground">{data.creditsMonth}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-chart-2/10">
            <TrendingDown className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Media Diaria</p>
            <p className="text-2xl font-bold text-foreground">
              {data.dailyUsage?.length > 0
                ? Math.round(
                    data.dailyUsage.reduce((s: number, d: { credits: number }) => s + d.credits, 0) /
                      data.dailyUsage.length
                  )
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Consumo Diario (14 dias)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.dailyUsage}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.6 0.01 240)" }} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey="credits" name="Creditos" fill="oklch(0.78 0.16 80)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top users */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Top Consumidores (Mes)
        </h3>
        {data.topUsers?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.topUsers.map((u: { agency_id: string; agency_name: string; credits_used: number }, i: number) => (
              <div
                key={u.agency_id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground font-medium">{u.agency_name}</span>
                </div>
                <span className="text-sm font-mono text-warning">{u.credits_used} cred.</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum consumo registrado este mes.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Loader2, Search, MapPin, Briefcase, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminSearchLogsPage() {
  const { data, isLoading } = useSWR("/api/admin/search-logs", fetcher, {
    refreshInterval: 30000,
  });

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
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Logs de Busca
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rastreamento de buscas Google Places na plataforma
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Buscas no Mes</p>
            <p className="text-2xl font-bold text-foreground">{data.totalSearches}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-chart-2/10">
            <Users className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resultados Totais</p>
            <p className="text-2xl font-bold text-foreground">
              {data.totalResults.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* Daily searches chart */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Buscas por Dia (14 dias)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.dailySearches}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.6 0.01 240)" }} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey="searches" name="Buscas" fill="oklch(0.72 0.19 165)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Niches */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Top Nichos</h3>
          </div>
          <div className="flex flex-col gap-2">
            {(data.topNiches || []).map(
              (n: { niche: string; count: number }, i: number) => (
                <div
                  key={n.niche}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary">
                      {i + 1}
                    </span>
                    <span className="text-xs text-foreground">{n.niche}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{n.count}</span>
                </div>
              )
            )}
            {(!data.topNiches || data.topNiches.length === 0) && (
              <p className="text-xs text-muted-foreground">Nenhum dado.</p>
            )}
          </div>
        </div>

        {/* Top Cities */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-chart-2" />
            <h3 className="text-sm font-semibold text-foreground">Top Cidades</h3>
          </div>
          <div className="flex flex-col gap-2">
            {(data.topCities || []).map(
              (c: { city: string; count: number }, i: number) => (
                <div
                  key={c.city}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-chart-2/10 text-chart-2">
                      {i + 1}
                    </span>
                    <span className="text-xs text-foreground">{c.city}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{c.count}</span>
                </div>
              )
            )}
            {(!data.topCities || data.topCities.length === 0) && (
              <p className="text-xs text-muted-foreground">Nenhum dado.</p>
            )}
          </div>
        </div>

        {/* Top Searchers */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Top Buscadores</h3>
          </div>
          <div className="flex flex-col gap-2">
            {(data.topSearchers || []).map(
              (s: { agency_id: string; agency_name: string; searches: number }, i: number) => (
                <div
                  key={s.agency_id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-warning/10 text-warning">
                      {i + 1}
                    </span>
                    <span className="text-xs text-foreground">{s.agency_name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{s.searches}</span>
                </div>
              )
            )}
            {(!data.topSearchers || data.topSearchers.length === 0) && (
              <p className="text-xs text-muted-foreground">Nenhum dado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent logs */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Buscas Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-3 py-2">
                  Cidade
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-3 py-2">
                  Nicho
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-3 py-2">
                  Resultados
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-3 py-2">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {(data.recent || []).slice(0, 20).map(
                (l: { id: string; query_city: string; query_niche: string; results_count: number; created_at: string }) => (
                  <tr key={l.id} className="border-b border-border/30">
                    <td className="px-3 py-2 text-xs text-foreground">{l.query_city || "N/A"}</td>
                    <td className="px-3 py-2 text-xs text-foreground">{l.query_niche || "N/A"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                      {l.results_count}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

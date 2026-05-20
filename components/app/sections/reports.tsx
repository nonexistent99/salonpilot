"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  BarChart3, TrendingUp, Users, ShoppingBag, Star, AlertCircle,
  Megaphone, Calendar, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["oklch(0.65 0.12 35)", "oklch(0.72 0.12 340)", "oklch(0.58 0.16 145)", "oklch(0.60 0.18 280)", "oklch(0.68 0.14 200)"];

export function ReportsSection() {
  const { data, isLoading } = useSWR("/api/dashboard", fetcher);
  const metrics = data?.metrics_history || [];
  const stats = data?.stats || {};

  const totalCustomers = parseInt(stats.total_customers || "0");
  const vipCustomers = parseInt(stats.vip_customers || "0");
  const inactiveCustomers = parseInt(stats.inactive_customers || "0");
  const avgTicket = parseFloat(stats.avg_ticket || "0");

  // Revenue chart data
  const revenueData = metrics.map((m: { date: string; revenue_estimated: number; appointments_count: number }) => ({
    date: format(new Date(m.date), "dd/MM", { locale: ptBR }),
    receita: Math.round(m.revenue_estimated),
    atendimentos: m.appointments_count,
  }));

  // Customer distribution for pie
  const customerDist = [
    { name: "Ativas", value: parseInt(stats.active_customers || "0") },
    { name: "VIP", value: vipCustomers },
    { name: "Novas", value: parseInt(stats.new_customers || "0") },
    { name: "Sumidas", value: inactiveCustomers },
    { name: "Quentes", value: parseInt(stats.hot_customers || "0") },
  ].filter(d => d.value > 0);

  const totalRevenue = metrics.reduce((sum: number, m: { revenue_estimated: number }) => sum + m.revenue_estimated, 0);
  const avgRevenue = metrics.length > 0 ? totalRevenue / metrics.length : 0;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded-xl w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Métricas e insights dos últimos 14 dias</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Receita total (14d)",
            value: `R$ ${Math.round(totalRevenue).toLocaleString("pt-BR")}`,
            icon: TrendingUp,
            color: "text-primary",
            bg: "bg-primary/10",
            insight: avgRevenue > 500 ? "Acima da meta" : "Abaixo do potencial",
            trend: "up",
          },
          {
            label: "Ticket médio",
            value: `R$ ${avgTicket.toFixed(0)}`,
            icon: ShoppingBag,
            color: "text-amber-600",
            bg: "bg-amber-100",
            insight: avgTicket < 80 ? "Abaixo da média — venda combos!" : "Bom desempenho",
            trend: avgTicket >= 80 ? "up" : "down",
          },
          {
            label: "Total de clientes",
            value: totalCustomers,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100",
            insight: `${vipCustomers} VIP, ${inactiveCustomers} sumidas`,
            trend: "neutral",
          },
          {
            label: "Clientes sumidas",
            value: inactiveCustomers,
            icon: AlertCircle,
            color: "text-red-500",
            bg: "bg-red-100",
            insight: inactiveCustomers > 10 ? "Urgente: criar campanha!" : "Sob controle",
            trend: inactiveCustomers > 10 ? "down" : "up",
          },
        ].map(({ label, value, icon: Icon, color, bg, insight, trend }) => (
          <div key={label} className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              {trend !== "neutral" && (
                trend === "up"
                  ? <ArrowUpRight className="w-4 h-4 text-green-500" />
                  : <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            <p className="text-xs text-muted-foreground/70 mt-1 italic">{insight}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-1">Evolução da receita</h2>
          <p className="text-xs text-muted-foreground mb-4">Últimos 14 dias</p>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.12 35)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.12 35)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 55)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.52 0.02 40)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.02 40)" }} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid oklch(0.88 0.01 55)", borderRadius: "10px", fontSize: 12 }}
                  formatter={(v: number) => [`R$ ${v}`, "Receita"]}
                />
                <Area type="monotone" dataKey="receita" stroke="oklch(0.65 0.12 35)" strokeWidth={2} fill="url(#reportGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Sem dados históricos ainda</p>
            </div>
          )}
        </div>

        {/* Customer distribution */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-1">Distribuição de clientes</h2>
          <p className="text-xs text-muted-foreground mb-4">Por status</p>
          {customerDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={customerDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                    {customerDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {customerDist.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-muted-foreground flex-1">{item.name}</span>
                    <span className="text-xs font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[140px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Sem dados</p>
            </div>
          )}
        </div>
      </div>

      {/* Atendimentos chart */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-1">Atendimentos por dia</h2>
        <p className="text-xs text-muted-foreground mb-4">Últimos 14 dias</p>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 55)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.52 0.02 40)" }} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.02 40)" }} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid oklch(0.88 0.01 55)", borderRadius: "10px", fontSize: 12 }}
                formatter={(v: number) => [v, "Atendimentos"]}
              />
              <Bar dataKey="atendimentos" fill="oklch(0.65 0.12 35)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[140px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sem dados históricos ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}

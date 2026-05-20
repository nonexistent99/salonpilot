"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Loader2, Users, UserCheck, UserPlus, DollarSign, TrendingUp, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function MetricCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            accent ? "bg-primary/10" : "bg-secondary"
          }`}
        >
          <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      <span className={`text-2xl font-bold tracking-tight ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useSWR("/api/admin/overview", fetcher, {
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
          Painel Administrativo
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visao geral da plataforma GrowthOS
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title="Total Usuarios" value={String(data.totalUsers)} icon={Users} />
        <MetricCard title="Ativos" value={String(data.activeUsers)} icon={UserCheck} />
        <MetricCard title="Novos Hoje" value={String(data.newToday)} icon={UserPlus} accent />
        <MetricCard
          title="MRR"
          value={`R$ ${data.mrr.toLocaleString("pt-BR")}`}
          icon={DollarSign}
          accent
        />
        <MetricCard
          title="ARR"
          value={`R$ ${data.arr.toLocaleString("pt-BR")}`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Receita (Mes)"
          value={`R$ ${data.totalRevenue.toLocaleString("pt-BR")}`}
          icon={Zap}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Crescimento de Usuarios</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
              <Tooltip {...chartTooltipStyle} />
              <Area
                type="monotone"
                dataKey="count"
                name="Usuarios"
                stroke="oklch(0.72 0.19 165)"
                fill="oklch(0.72 0.19 165 / 0.15)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="revenue" name="Receita (R$)" fill="oklch(0.72 0.19 165)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Growth */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuicao de Planos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.subGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.01 240)" }} />
              <Tooltip {...chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.6 0.01 240)" }} />
              <Bar dataKey="free" name="Free" fill="oklch(0.6 0.01 240)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="starter" name="Starter" fill="oklch(0.7 0.16 200)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pro" name="Pro" fill="oklch(0.72 0.19 165)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Receita por Plano</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data.revenueByPlan || {}).map(([plan, info]) => {
            const d = info as { count: number; revenue: number };
            return (
              <div key={plan} className="p-4 rounded-lg bg-secondary/30 border border-border">
                <p className="text-xs text-muted-foreground uppercase font-medium">{plan}</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  R$ {d.revenue.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.count} assinaturas
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

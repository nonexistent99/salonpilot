"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Section } from "@/app/page";
import {
  Users, TrendingUp, Calendar, Megaphone, Brain,
  Star, AlertCircle, Clock, CheckCircle2, ChevronRight,
  ArrowUpRight, Sparkles, Zap, Target, Trophy,
  ShoppingBag, Scissors, BarChart3
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardSectionProps {
  onSectionChange?: (section: Section) => void;
}

const STATUS_CONFIG = {
  vip: { label: "VIP", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  active: { label: "Ativa", color: "text-green-600", bg: "bg-green-500/10", border: "border-green-500/20" },
  new: { label: "Nova", color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  inactive: { label: "Sumida", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/20" },
  hot: { label: "Quente", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/20" },
};

const APPOINTMENT_STATUS = {
  scheduled: { label: "Agendado", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  confirmed: { label: "Confirmado", color: "text-blue-600", dot: "bg-blue-500" },
  attended: { label: "Atendida", color: "text-green-600", dot: "bg-green-500" },
  no_show: { label: "Faltou", color: "text-red-600", dot: "bg-red-500" },
  canceled: { label: "Cancelado", color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

const PRIORITY_CONFIG = {
  urgent: { label: "Urgente", color: "text-red-600", bg: "bg-red-500/8", border: "border-red-500/15" },
  high: { label: "Alta", color: "text-orange-600", bg: "bg-orange-500/8", border: "border-orange-500/15" },
  medium: { label: "Média", color: "text-primary", bg: "bg-primary/8", border: "border-primary/15" },
  low: { label: "Baixa", color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border" },
};

export function DashboardSection({ onSectionChange }: DashboardSectionProps) {
  const { data, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 60000
  });
  const { data: intel } = useSWR("/api/intelligence/dashboard", fetcher, {
    refreshInterval: 120000
  });
  const [completingMission, setCompletingMission] = useState<string | null>(null);

  const healthScore = intel?.health_score ?? null;

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const ownerName = data?.salon?.owner_name?.split(" ")?.[0] || "Dona";

  const chartData = (data?.metrics_history || []).map((m: {
    date: string;
    revenue_estimated: number | string;
    appointments_count: number | string;
  }) => ({
    date: format(new Date(m.date), "dd/MM", { locale: ptBR }),
    receita: Math.round(parseFloat(String(m.revenue_estimated || 0))),
    atendimentos: parseInt(String(m.appointments_count || 0)),
  }));

  // Stats
  const stats = data?.stats || {};
  const totalCustomers = parseInt(stats.total_customers || "0");
  const vipCustomers = parseInt(stats.vip_customers || "0");
  const inactiveCustomers = parseInt(stats.inactive_customers || "0");
  const newCustomers = parseInt(stats.new_customers || "0");
  const avgTicket = parseFloat(stats.avg_ticket || "0");

  const todayAppointments = data?.today_appointments || [];
  const todayRevenue = parseFloat(String(data?.today_revenue || 0));
  const activeCampaigns = data?.active_campaigns || 0;
  const recommendations = data?.recommendations || [];
  const missions = data?.missions || [];

  const completeMission = async (missionId: string) => {
    setCompletingMission(missionId);
    try {
      await fetch(`/api/missions/${missionId}/complete`, { method: "PATCH" });
      mutate();
    } finally {
      setCompletingMission(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-muted rounded-xl w-72" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {ownerName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })} — Aqui está o resumo do seu salão hoje
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSectionChange?.("intelligence")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-700 text-sm font-semibold hover:opacity-90 transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            Intelligence
          </button>
          <button
            onClick={() => onSectionChange?.("campaigns")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all glow-primary"
          >
            <Megaphone className="w-4 h-4" />
            Criar campanha
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue today */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Hoje</span>
          </div>
          <p className="text-2xl font-bold text-foreground">R$ {todayRevenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Faturamento estimado</p>
        </div>

        {/* Appointments today */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Agenda</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{todayAppointments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Atendimentos hoje</p>
        </div>

        {/* Inactive customers */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-4.5 h-4.5 text-red-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Urgente</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{inactiveCustomers}</p>
          <p className="text-xs text-muted-foreground mt-1">Clientes sumidas</p>
        </div>

        {/* Avg ticket */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Média</span>
          </div>
          <p className="text-2xl font-bold text-foreground">R$ {avgTicket.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Ticket médio</p>
        </div>

        {/* Growth Health Score */}
        {healthScore && (
          <div
            className="metric-card cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onSectionChange?.("intelligence")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <BarChart3 className="w-4.5 h-4.5 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Score</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{Math.round(healthScore.total)}</p>
            <p className="text-xs text-muted-foreground mt-1">Índice de crescimento
              <span className={`ml-1 font-semibold ${
                healthScore.total >= 70 ? 'text-emerald-600' :
                healthScore.total >= 45 ? 'text-amber-600' : 'text-red-600'
              }`}>/100</span>
            </p>
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Crescimento do salão</h2>
              <p className="text-xs text-muted-foreground">Últimos 14 dias</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Receita</span>
              </div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.12 35)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.65 0.12 35)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 55)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.52 0.02 40)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.02 40)" }} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid oklch(0.88 0.01 55)",
                    borderRadius: "10px",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`R$ ${v}`, "Receita"]}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="oklch(0.65 0.12 35)"
                  strokeWidth={2}
                  fill="url(#receitaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Sem dados históricos ainda</p>
            </div>
          )}
        </div>

        {/* Customer stats */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Suas clientes</h2>
            <button
              onClick={() => onSectionChange?.("clients")}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: "Total de clientes", value: totalCustomers, icon: Users, color: "text-foreground" },
              { label: "Clientes VIP", value: vipCustomers, icon: Star, color: "text-amber-600" },
              { label: "Novas (7 dias)", value: newCustomers, icon: Zap, color: "text-green-600" },
              { label: "Clientes sumidas", value: inactiveCustomers, icon: AlertCircle, color: "text-red-500" },
              { label: "Campanhas ativas", value: activeCampaigns, icon: Megaphone, color: "text-violet-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className={`text-sm font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section: AI recommendations + Today schedule + Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Recommendations */}
        <div className="lg:col-span-1 glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="font-semibold text-foreground">Bella IA recomenda</h2>
          </div>
          <div className="space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((rec: {
                id: string;
                title: string;
                description: string;
                priority: keyof typeof PRIORITY_CONFIG;
              }) => {
                const config = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-xl border ${config.bg} ${config.border} cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={() => onSectionChange?.("ai-coach")}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${config.color}`} />
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-snug">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sem recomendações agora</p>
              </div>
            )}
            <button
              onClick={() => onSectionChange?.("ai-coach")}
              className="w-full text-xs text-violet-600 font-medium hover:underline flex items-center justify-center gap-1 py-1"
            >
              <Brain className="w-3.5 h-3.5" />
              Perguntar para a Bella IA
            </button>
          </div>
        </div>

        {/* Today's schedule */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-foreground">Agenda de hoje</h2>
            </div>
            <button
              onClick={() => onSectionChange?.("calendar")}
              className="text-xs text-primary font-medium hover:underline"
            >
              Ver tudo
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((apt: {
                id: string;
                start_time: string;
                customer_name: string;
                service_name: string;
                status: keyof typeof APPOINTMENT_STATUS;
                value: number;
              }) => {
                const statusInfo = APPOINTMENT_STATUS[apt.status] || APPOINTMENT_STATUS.scheduled;
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusInfo.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {apt.customer_name || "Cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {apt.service_name || "Serviço"} • {format(new Date(apt.start_time), "HH:mm")}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${statusInfo.color} shrink-0`}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhum agendamento hoje</p>
                <button
                  onClick={() => onSectionChange?.("campaigns")}
                  className="text-xs text-primary font-medium hover:underline mt-1"
                >
                  Criar campanha para preencher agenda
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Daily missions */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="font-semibold text-foreground">Missões do dia</h2>
            </div>
            <button
              onClick={() => onSectionChange?.("missions")}
              className="text-xs text-primary font-medium hover:underline"
            >
              Ver tudo
            </button>
          </div>
          <div className="space-y-2">
            {missions.length > 0 ? (
              missions.slice(0, 5).map((mission: {
                id: string;
                title: string;
                points: number;
                status: string;
                action_url: string | null;
              }) => (
                <div
                  key={mission.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                    mission.status === "completed"
                      ? "opacity-60"
                      : "hover:bg-muted/50 cursor-pointer"
                  }`}
                  onClick={() => mission.status !== "completed" && completeMission(mission.id)}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      mission.status === "completed"
                        ? "bg-primary border-primary"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {mission.status === "completed" && (
                      <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  <p
                    className={`text-sm flex-1 ${
                      mission.status === "completed"
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {mission.title}
                  </p>
                  <span className="text-xs font-semibold text-amber-600">+{mission.points}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sem missões hoje</p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Ações rápidas</p>
            <button
              onClick={() => onSectionChange?.("clients")}
              className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Ver clientes para chamar
              </span>
              <ArrowUpRight className="w-3 h-3 ml-auto text-muted-foreground/50" />
            </button>
            <button
              onClick={() => onSectionChange?.("campaigns")}
              className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <Target className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Criar campanha agora
              </span>
              <ArrowUpRight className="w-3 h-3 ml-auto text-muted-foreground/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Trophy, CheckCircle2, Clock, Star, Zap, Flame, Medal, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LEVEL_CONFIG = [
  { level: 1, name: "Salão Organizando", xpRequired: 0, color: "text-muted-foreground", bg: "bg-muted/50" },
  { level: 2, name: "Salão Ativo", xpRequired: 200, color: "text-blue-600", bg: "bg-blue-50" },
  { level: 3, name: "Salão em Crescimento", xpRequired: 500, color: "text-primary", bg: "bg-primary/10" },
  { level: 4, name: "Salão Estratégico", xpRequired: 1000, color: "text-violet-600", bg: "bg-violet-50" },
  { level: 5, name: "Salão Referência", xpRequired: 2000, color: "text-amber-600", bg: "bg-amber-50" },
];

export function MissionsSection() {
  const { data, mutate } = useSWR("/api/dashboard", fetcher);
  const missions = data?.missions || [];

  const completed = missions.filter((m: { status: string }) => m.status === "completed");
  const pending = missions.filter((m: { status: string }) => m.status === "pending");
  const totalXP = completed.reduce((sum: number, m: { points: number }) => sum + (m.points || 0), 0);

  // Determine level
  const currentLevel = LEVEL_CONFIG.reduce((best, l) => totalXP >= l.xpRequired ? l : best, LEVEL_CONFIG[0]);
  const nextLevel = LEVEL_CONFIG.find(l => l.xpRequired > totalXP);
  const progressToNext = nextLevel
    ? Math.round(((totalXP - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100)
    : 100;

  const completeMission = async (id: string) => {
    await fetch(`/api/missions/${id}/complete`, { method: "PATCH" });
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Missões do dia
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* XP & Level card */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl ${currentLevel.bg} flex items-center justify-center`}>
            <Medal className={`w-7 h-7 ${currentLevel.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={`font-bold text-lg ${currentLevel.color}`}>Nível {currentLevel.level}</p>
              <span className="text-xs text-muted-foreground">•</span>
              <p className="text-sm text-muted-foreground">{currentLevel.name}</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{totalXP} XP conquistados</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{completed.length}/{missions.length}</p>
            <p className="text-xs text-muted-foreground">missões hoje</p>
          </div>
        </div>
        {nextLevel && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progresso para Nível {currentLevel.level + 1}</span>
              <span>{totalXP} / {nextLevel.xpRequired} XP</span>
            </div>
            <div className="xp-bar">
              <div className="xp-bar-fill" style={{ width: `${progressToNext}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Faltam {nextLevel.xpRequired - totalXP} XP para "{nextLevel.name}"
            </p>
          </div>
        )}
        {!nextLevel && (
          <div className="text-center py-2">
            <p className="text-sm font-semibold text-amber-600">🏆 Nível máximo atingido! Você é referência!</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Missões completas", value: completed.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "XP do dia", value: totalXP, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Em aberto", value: pending.length, icon: Target, color: "text-primary", bg: "bg-primary/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Mission list */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Missões de hoje</h2>
        {missions.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma missão para hoje</p>
            <p className="text-sm text-muted-foreground/60 mt-1">As missões são geradas automaticamente com base nos dados do seu salão</p>
          </div>
        ) : (
          <div className="space-y-2">
            {missions.map((mission: {
              id: string;
              title: string;
              description: string;
              points: number;
              status: string;
              action_url: string | null;
            }) => (
              <div
                key={mission.id}
                className={`glass-card rounded-xl p-4 flex items-center gap-4 transition-all ${
                  mission.status === "completed" ? "opacity-60" : "hover:shadow-md cursor-pointer"
                }`}
                onClick={() => mission.status !== "completed" && completeMission(mission.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  mission.status === "completed"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border-2 border-border hover:border-primary"
                }`}>
                  {mission.status === "completed"
                    ? <CheckCircle2 className="w-5 h-5" />
                    : <Clock className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${mission.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {mission.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mission.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-bold text-amber-600">+{mission.points}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

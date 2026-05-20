"use client";

import { motion } from "framer-motion";
import { Target, Flame, TrendingUp, CalendarDays } from "lucide-react";

interface GoalTrackerProps {
  monthlyGoal: number;
  currentRevenue: number;
  averageTicket: number;
  conversionRate: number;
  meetingsCompleted: number;
  salesClosed: number;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function getWorkingDaysLeft(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;
  // Include today
  for (let day = now.getDate(); day <= lastDay; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return Math.max(count, 1);
}

function getDaysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Include today as a remaining working day
  return Math.max(lastDay - now.getDate() + 1, 1);
}

export function GoalTracker({
  monthlyGoal = 10000,
  currentRevenue = 0,
  averageTicket = 1500,
  conversionRate = 20,
  meetingsCompleted = 0,
  salesClosed = 0,
}: GoalTrackerProps) {
  const now = new Date();
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  const workingDaysLeft = getWorkingDaysLeft();
  const daysLeft = getDaysLeftInMonth();

  const progressPercentage = monthlyGoal > 0 ? Math.min((currentRevenue / monthlyGoal) * 100, 100) : 0;
  const salesNeeded = averageTicket > 0 ? Math.ceil(monthlyGoal / averageTicket) : 0;
  const meetingsNeeded = conversionRate > 0 ? Math.ceil(salesNeeded / (conversionRate / 100)) : 0;
  const remainingSales = Math.max(salesNeeded - salesClosed, 0);
  const remainingMeetings = Math.max(meetingsNeeded - meetingsCompleted, 0);
  const meetingsPerDay = workingDaysLeft > 0 ? Math.ceil(remainingMeetings / workingDaysLeft) : 0;
  const remaining = Math.max(monthlyGoal - currentRevenue, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-xl p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Meta Mensal</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentMonth} {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              R$ {monthlyGoal.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Progresso</span>
          <span className="text-sm font-semibold text-foreground">
            R$ {currentRevenue.toLocaleString("pt-BR")} / R$ {monthlyGoal.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
            className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
          </motion.div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted-foreground">{progressPercentage.toFixed(0)}% concluído</span>
          <span className="text-xs text-muted-foreground">
            Faltam R$ {remaining.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* Smart calculations */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <span className="text-xs text-muted-foreground">Vendas necessárias</span>
          <p className="text-xl font-bold text-foreground mt-1">{salesNeeded}</p>
          <span className="text-xs text-muted-foreground">Fechadas: {salesClosed}</span>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <span className="text-xs text-muted-foreground">Reuniões necessárias</span>
          <p className="text-xl font-bold text-foreground mt-1">{meetingsNeeded}</p>
          <span className="text-xs text-muted-foreground">Realizadas: {meetingsCompleted}</span>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <span className="text-xs text-muted-foreground">Taxa conversão</span>
          <p className="text-xl font-bold text-foreground mt-1">{conversionRate}%</p>
          <span className="text-xs text-muted-foreground">de reuniões em vendas</span>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <span className="text-xs text-muted-foreground">Ticket médio</span>
          <p className="text-xl font-bold text-foreground mt-1">
            R$ {averageTicket.toLocaleString("pt-BR")}
          </p>
          <span className="text-xs text-muted-foreground">por cliente</span>
        </div>
      </div>

      {/* Alert card */}
      {remainingMeetings > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-chart-2/10 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Ritmo necessário</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Você precisa fazer{" "}
            <span className="text-primary font-bold">{meetingsPerDay} {meetingsPerDay === 1 ? 'reunião' : 'reuniões'} por dia</span>
            {" "}para atingir sua meta. Faltam{" "}
            <span className="text-foreground font-semibold">{remainingMeetings} {remainingMeetings === 1 ? 'reunião' : 'reuniões'}</span>
            {" "}em {workingDaysLeft} {workingDaysLeft === 1 ? 'dia útil' : 'dias úteis'}.
          </p>
        </motion.div>
      )}

      {progressPercentage >= 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-lg bg-success/10 border border-success/20"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm font-semibold text-success">Meta batida! 🎉</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Parabéns! Você atingiu sua meta mensal de R$ {monthlyGoal.toLocaleString("pt-BR")}.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

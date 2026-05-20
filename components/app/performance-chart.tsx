"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface HistoryEntry {
  month: string;
  revenue: number;
  goal?: number;
}

interface PerformanceChartProps {
  history?: HistoryEntry[];
  monthlyGoal?: number;
}

const monthLabels: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

export function PerformanceChart({ history, monthlyGoal = 10000 }: PerformanceChartProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const now = new Date();
  const chartData =
    history && history.length > 0
      ? history.map((h) => {
          const m = h.month?.slice(5, 7) || "01";
          return {
            month: monthLabels[m] || m,
            receita: Number(h.revenue) || 0,
            meta: Number(h.goal) || monthlyGoal,
          };
        })
      : generateEmptyHistory(monthlyGoal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-xl p-5 h-[380px]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Evolução de Receita</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Receita vs Meta mensal</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-chart-1" />
            <span className="text-muted-foreground">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">Meta</span>
          </div>
        </div>
      </div>

      <div className={`h-[280px] transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="receitaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.19 165)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.72 0.19 165)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.16 200)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="oklch(0.7 0.16 200)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.01 240)" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "oklch(0.6 0.01 240)", fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "oklch(0.6 0.01 240)", fontSize: 12 }} tickFormatter={(v) => `R$${v / 1000}k`} dx={-10} />
            <Tooltip
              contentStyle={{ backgroundColor: "oklch(0.11 0.01 240)", border: "1px solid oklch(0.2 0.01 240)", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "oklch(0.96 0 0)", fontWeight: 600 }}
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString("pt-BR")}`,
                name === "receita" ? "Receita" : "Meta",
              ]}
            />
            <Area type="monotone" dataKey="meta" stroke="oklch(0.7 0.16 200)" strokeWidth={2} strokeDasharray="5 5" fill="url(#metaGradient)" dot={false} />
            <Area type="monotone" dataKey="receita" stroke="oklch(0.72 0.19 165)" strokeWidth={2.5} fill="url(#receitaGradient)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function generateEmptyHistory(goal: number) {
  const now = new Date();
  const months: { month: string; receita: number; meta: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push({
      month: monthLabels[m] || m,
      receita: 0,
      meta: goal,
    });
  }
  return months;
}

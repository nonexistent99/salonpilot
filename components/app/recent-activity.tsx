"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Phone, CalendarDays, ArrowUpRight, Users } from "lucide-react";

interface RecentLead {
  id: string;
  name: string;
  niche: string;
  status: string;
  created_at: string;
}
interface RecentDeal {
  id: string;
  value: number;
  status: string;
  created_at: string;
  leads?: { name: string; niche: string } | null;
}

interface RecentActivityProps {
  leads?: RecentLead[];
  deals?: RecentDeal[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  new: { icon: Users, color: "text-chart-2", bg: "bg-chart-2/10" },
  contacted: { icon: Phone, color: "text-warning", bg: "bg-warning/10" },
  scheduled: { icon: CalendarDays, color: "text-chart-2", bg: "bg-chart-2/10" },
  closed_won: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  closed_lost: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  no_answer: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50" },
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Agora";
  if (diff < 3600) return `Ha ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Ha ${Math.floor(diff / 3600)}h`;
  return `Ha ${Math.floor(diff / 86400)}d`;
}

export function RecentActivity({ leads = [], deals = [] }: RecentActivityProps) {
  const activities = [
    ...deals.map((d) => ({
      key: `deal-${d.id}`,
      company: d.leads?.name || "Lead",
      action: d.status === "closed_won" ? `Venda fechada - R$ ${Number(d.value).toLocaleString("pt-BR")}` : "Deal criado",
      status: d.status === "closed_won" ? "closed_won" : "new",
      time: timeAgo(d.created_at),
      niche: d.leads?.niche || "",
    })),
    ...leads.map((l) => ({
      key: `lead-${l.id}`,
      company: l.name,
      action: l.status === "new" ? "Novo lead adicionado" : `Status: ${l.status}`,
      status: l.status,
      time: timeAgo(l.created_at),
      niche: l.niche || "",
    })),
  ]
    .sort((a, b) => 0) // already sorted from API
    .slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-xl p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Atividade Recente</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Últimas ações realizadas</p>
        </div>
        {activities.length > 0 && (
          <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-lg bg-secondary/50 border border-border">
            {activities.length} {activities.length === 1 ? 'ação' : 'ações'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {activities.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma atividade recente. Comece buscando leads!
          </div>
        )}
        {activities.map((activity, index) => {
          const config = statusConfig[activity.status] || statusConfig.new;
          const StatusIcon = config.icon;

          return (
            <motion.div
              key={activity.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.08 }}
              className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", config.bg)}>
                  <StatusIcon className={cn("w-4 h-4", config.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.company}</p>
                  <p className="text-xs text-muted-foreground">{activity.action}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">{activity.time}</span>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{activity.niche}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Megaphone,
  Brain,
  Instagram,
  BarChart3,
  Trophy,
  Settings,
  Plug,
  Shield,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Star,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface AppSidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const navItems: { id: Section; label: string; icon: React.ElementType; group?: string }[] = [
  { id: "dashboard", label: "Início", icon: LayoutDashboard, group: "principal" },
  { id: "clients", label: "Clientes", icon: Users, group: "principal" },
  { id: "campaigns", label: "Campanhas", icon: Megaphone, group: "principal" },
  { id: "calendar", label: "Agenda", icon: CalendarDays, group: "principal" },
  { id: "ai-coach", label: "Bella IA", icon: Brain, group: "ia" },
  { id: "intelligence", label: "Growth Intelligence", icon: Zap, group: "ia" },
  { id: "content", label: "Conteúdo", icon: Instagram, group: "ia" },
  { id: "reports", label: "Relatórios", icon: BarChart3, group: "analise" },
  { id: "missions", label: "Missões", icon: Trophy, group: "analise" },
  { id: "integrations", label: "Integrações", icon: Plug, group: "config" },
  { id: "settings", label: "Configurações", icon: Settings, group: "config" },
];

const groupLabels: Record<string, string> = {
  principal: "Principal",
  ia: "Inteligência",
  analise: "Análise",
  config: "Sistema",
};

export function AppSidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: AppSidebarProps) {
  const { data: dashboard } = useSWR("/api/dashboard", fetcher);
  const salonName = dashboard?.salon?.name || "Meu Salão";

  // Missions progress
  const missions = dashboard?.missions || [];
  const completedMissions = missions.filter((m: { status: string }) => m.status === "completed").length;
  const totalMissions = missions.length || 5;
  const missionProgress = Math.round((completedMissions / totalMissions) * 100);

  // Group nav items
  const groups = navItems.reduce((acc, item) => {
    const g = item.group || "principal";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col",
        "bg-sidebar-gradient",
        collapsed ? "w-[72px]" : "w-[264px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary glow-primary">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <div
            className={cn(
              "transition-all duration-300 overflow-hidden",
              collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            )}
          >
            <p className="font-bold text-sm text-sidebar-foreground whitespace-nowrap leading-tight">
              BeautyGrowth
            </p>
            <p className="text-xs text-muted-foreground whitespace-nowrap leading-tight truncate max-w-[150px]">
              {salonName}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1.5">
                {groupLabels[group]}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isAI = item.id === "ai-coach";

                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                      isActive
                        ? isAI
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                          : "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
                        isAI ? "bg-violet-500" : "bg-primary"
                      )} />
                    )}
                    <Icon
                      className={cn(
                        "w-4.5 h-4.5 shrink-0 transition-all duration-200",
                        isActive
                          ? isAI ? "text-violet-600 dark:text-violet-400" : "text-primary"
                          : "group-hover:scale-110",
                        isAI && !isActive && "text-violet-400"
                      )}
                    />
                    <span
                      className={cn(
                        "whitespace-nowrap transition-all duration-300",
                        collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                      )}
                    >
                      {item.label}
                    </span>
                    {item.id === "ai-coach" && !collapsed && (
                      <Sparkles className="w-3 h-3 ml-auto text-violet-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin link */}
      {dashboard?.user?.is_admin && (
        <div className="px-3 pb-2">
          <Link
            href="/admin"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              "text-amber-600 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
            )}
          >
            <Shield className="w-4.5 h-4.5 shrink-0" />
            {!collapsed && <span>Painel Admin</span>}
          </Link>
        </div>
      )}

      {/* Missions progress */}
      {!collapsed && totalMissions > 0 && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Missões do dia</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {completedMissions}/{totalMissions}
              </span>
            </div>
            <div className="xp-bar">
              <div className="xp-bar-fill" style={{ width: `${missionProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

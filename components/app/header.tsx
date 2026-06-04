"use client";

import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import {
  Bell, Search, X, Check, CheckCheck, LogOut, User, Settings,
  ChevronDown, Scissors, Brain, Users, Megaphone, Calendar,
  BarChart3, Trophy, Plug, Instagram, MessageCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface HeaderProps {
  activeSection: Section;
  onSectionChange?: (section: Section) => void;
}

const sectionTitles: Record<Section, { title: string; subtitle: string }> = {
  dashboard: { title: "Início", subtitle: "O que está acontecendo no seu salão hoje" },
  clients: { title: "Clientes", subtitle: "Gerencie sua carteira de clientes" },
  campaigns: { title: "Campanhas", subtitle: "Crie e acompanhe suas campanhas" },
  inbox: { title: "Inbox WhatsApp", subtitle: "Atendimento, IA e handoff humano" },
  calendar: { title: "Agenda", subtitle: "Seus agendamentos e horários" },
  "ai-coach": { title: "Bella IA", subtitle: "Sua consultora de crescimento inteligente" },
  content: { title: "Conteúdo", subtitle: "Posts e Stories para o Instagram" },
  reports: { title: "Relatórios", subtitle: "Métricas e insights do seu salão" },
  missions: { title: "Missões", subtitle: "Ações diárias para crescer mais" },
  integrations: { title: "Integrações", subtitle: "Conecte WhatsApp via Evolution API" },
  settings: { title: "Configurações", subtitle: "Dados do salão e preferências" },
  intelligence: { title: "Inteligência", subtitle: "Motor de crescimento com KPIs e IA estratégica" },
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type SearchResult = {
  icon: React.ElementType;
  label: string;
  description: string;
  action: () => void;
};

export function AppHeader({ activeSection, onSectionChange }: HeaderProps) {
  const router = useRouter();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const section = sectionTitles[activeSection];

  const { data: userData } = useSWR("/api/auth/me", fetcher);
  const { data: dashboard } = useSWR("/api/dashboard", fetcher);

  const user = userData?.user;
  const salonName = dashboard?.salon?.name || "Meu Salão";
  const fullName = user?.name || user?.full_name || "Usuária";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  // Global search
  const searchResults = getSearchResults(searchQuery, onSectionChange);

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6">
      <div>
        <h1 className="text-base font-semibold text-foreground leading-tight">{section.title}</h1>
        <p className="text-xs text-muted-foreground">{section.subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Global Search */}
        <div className="relative">
          <div className={cn("relative flex items-center transition-all duration-300", searchFocused ? "w-64" : "w-44")}>
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar páginas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
            />
          </div>
          {searchFocused && searchQuery.length > 0 && searchResults.length > 0 && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-card border border-border shadow-xl z-50 py-1">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => { e.preventDefault(); r.action(); setSearchQuery(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <r.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications bell (placeholder) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <Bell className="w-4.5 h-4.5" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-card border border-border shadow-xl z-50">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
                <button onClick={() => setNotifOpen(false)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sem notificações novas</p>
              </div>
            </div>
          )}
        </div>

        {/* Avatar Dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="flex items-center gap-2 rounded-xl hover:bg-muted/60 transition-all p-1 pr-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", avatarOpen && "rotate-180")} />
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden">
              {/* User info */}
              <div className="p-4 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Scissors className="w-3 h-3" />
                      {salonName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {[
                  { icon: Settings, label: "Configurações", section: "settings" as Section },
                  { icon: Plug, label: "Integrações", section: "integrations" as Section },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { onSectionChange?.(item.section); setAvatarOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div className="border-t border-border py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function getSearchResults(query: string, onSectionChange?: (s: Section) => void): SearchResult[] {
  if (!query || query.length < 2 || !onSectionChange) return [];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const results: SearchResult[] = [];

  const pages: { keywords: string[]; section: Section; label: string; desc: string; icon: React.ElementType }[] = [
    { keywords: ["dashboard", "inicio", "home", "hoje"], section: "dashboard", label: "Início", desc: "Resumo do dia no salão", icon: Scissors },
    { keywords: ["clientes", "crm", "carteira", "contato"], section: "clients", label: "Clientes", desc: "Gerencie sua carteira", icon: Users },
    { keywords: ["campanha", "campanhas", "mensagem", "disparar"], section: "campaigns", label: "Campanhas", desc: "Crie campanhas", icon: Megaphone },
    { keywords: ["inbox", "whatsapp", "conversas", "mensagens"], section: "inbox", label: "Inbox WhatsApp", desc: "Atendimento e handoff", icon: MessageCircle },
    { keywords: ["agenda", "calendario", "horario", "agendamento"], section: "calendar", label: "Agenda", desc: "Seus agendamentos", icon: Calendar },
    { keywords: ["ia", "inteligencia", "coach", "bella", "dica", "conselho"], section: "ai-coach", label: "Bella IA", desc: "Sua consultora", icon: Brain },
    { keywords: ["conteudo", "instagram", "post", "story", "reels"], section: "content", label: "Conteúdo", desc: "Posts para Instagram", icon: Instagram },
    { keywords: ["relatorios", "metricas", "dados", "analytics", "crescimento"], section: "reports", label: "Relatórios", desc: "Métricas do salão", icon: BarChart3 },
    { keywords: ["missoes", "desafios", "conquistas", "xp", "pontos"], section: "missions", label: "Missões", desc: "Missões diárias", icon: Trophy },
    { keywords: ["integracoes", "evolution", "whatsapp", "webhook", "api"], section: "integrations", label: "Integrações", desc: "Conectar sistemas", icon: Plug },
    { keywords: ["config", "configuracao", "settings", "notificacao", "senha", "salao"], section: "settings", label: "Configurações", desc: "Ajuste suas preferências", icon: Settings },
  ];

  for (const p of pages) {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (p.keywords.some((k) => norm(k).includes(q) || q.includes(norm(k)))) {
      results.push({ icon: p.icon, label: p.label, description: p.desc, action: () => onSectionChange(p.section) });
    }
  }
  return results.slice(0, 5);
}

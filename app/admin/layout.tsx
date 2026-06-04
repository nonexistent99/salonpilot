"use client";

import { AdminGuard } from "@/components/admin-guard";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Coins,
  Brain,
  Search,
  CreditCard,
  ChevronLeft,
  Shield,
  Building2,
  KeyRound,
  MessageCircle,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Visao Geral", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/salons", label: "Saloes", icon: Building2 },
  { href: "/admin/settings", label: "Chaves e IA", icon: KeyRound },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/credits", label: "Creditos", icon: Coins },
  { href: "/admin/ai-usage", label: "Uso de IA", icon: Brain },
  { href: "/admin/search-logs", label: "Buscas", icon: Search },
  { href: "/admin/billing", label: "Faturamento", icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-radial-gradient">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-[260px] border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-destructive/20 border border-destructive/30">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight">
              GrowthOS
            </span>
            <span className="text-[10px] font-medium text-destructive uppercase tracking-widest">
              Admin
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-all duration-200",
                    isActive ? "text-primary" : "group-hover:scale-110"
                  )}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Voltar ao App</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-[260px] flex flex-col">
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
      </div>
    </AdminGuard>
  );
}

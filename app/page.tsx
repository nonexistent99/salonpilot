"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AppSidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/header";
import { DashboardSection } from "@/components/app/sections/dashboard";
import { ClientsSection } from "@/components/app/sections/clients";
import { CampaignsSection } from "@/components/app/sections/campaigns";
import { CalendarSection } from "@/components/app/sections/calendar";
import { AICoachSection } from "@/components/app/sections/ai-coach";
import { ContentSection } from "@/components/app/sections/content";
import { ReportsSection } from "@/components/app/sections/reports";
import { MissionsSection } from "@/components/app/sections/missions";
import { IntegrationsSection } from "@/components/app/sections/integrations";
import { SettingsSection } from "@/components/app/sections/settings";
import { IntelligenceDashboard } from "@/components/app/sections/intelligence";
import { Loader2, Scissors } from "lucide-react";

export type Section =
  | "dashboard"
  | "clients"
  | "campaigns"
  | "calendar"
  | "ai-coach"
  | "content"
  | "reports"
  | "missions"
  | "integrations"
  | "settings"
  | "intelligence";

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          router.push("/auth/login");
          return;
        }
        const { user } = await res.json();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        setAuthenticated(true);
        setLoading(false);
      } catch {
        router.push("/auth/login");
      }
    };
    checkAuth();
  }, [router]);

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen bg-beauty-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary glow-primary flex items-center justify-center">
            <Scissors className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection onSectionChange={setActiveSection} />;
      case "clients":
        return <ClientsSection />;
      case "campaigns":
        return <CampaignsSection />;
      case "calendar":
        return <CalendarSection />;
      case "ai-coach":
        return <AICoachSection />;
      case "content":
        return <ContentSection />;
      case "reports":
        return <ReportsSection />;
      case "missions":
        return <MissionsSection />;
      case "integrations":
        return <IntegrationsSection />;
      case "settings":
        return <SettingsSection />;
      case "intelligence":
        return <IntelligenceDashboard onSectionChange={setActiveSection} />;
      default:
        return <DashboardSection onSectionChange={setActiveSection} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-beauty-gradient">
      <AppSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[264px]"
        }`}
      >
        <AppHeader activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

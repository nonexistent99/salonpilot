"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plug, CheckCircle2, XCircle, AlertCircle, ExternalLink, Webhook, Key } from "lucide-react";

export function IntegrationsSection() {
  const { data: salonData } = useSWR("/api/salons/me", fetcher);
  const [zaiaKey, setZaiaKey] = useState("");
  const [zaiaAgentId, setZaiaAgentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveZaia = async () => {
    if (!zaiaKey) return;
    setSaving(true);
    try {
      await fetch("/api/integrations/zaia/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: zaiaKey, agent_id: zaiaAgentId }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground">Conecte seu salão ao WhatsApp, Instagram e mais</p>
      </div>

      {/* Zaia Integration */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground">Zaia IA</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Recomendado</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte o atendimento via WhatsApp e Instagram. A Zaia conversa com suas clientes e envia os dados para o BeautyGrowth.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">API Key da Zaia</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="zaia_key_..."
                value={zaiaKey}
                onChange={(e) => setZaiaKey(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ID do Agente</label>
            <input
              type="text"
              placeholder="agent_..."
              value={zaiaAgentId}
              onChange={(e) => setZaiaAgentId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Webhook className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">URL do Webhook para configurar na Zaia:</p>
                <code className="text-xs text-primary mt-1 block break-all">
                  {typeof window !== "undefined" ? `${window.location.origin}/api/integrations/zaia/webhook` : "https://seudominio.com/api/integrations/zaia/webhook"}
                </code>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveZaia}
            disabled={saving || !zaiaKey}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</> : saving ? "Salvando..." : "Conectar Zaia"}
          </button>
        </div>
      </div>

      {/* Other integrations (coming soon) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            name: "WhatsApp Business",
            desc: "Envie mensagens diretamente via API oficial",
            icon: "💬",
            status: "via_zaia",
          },
          {
            name: "Google Calendar",
            desc: "Sincronize sua agenda automaticamente",
            icon: "📅",
            status: "soon",
          },
          {
            name: "Instagram",
            desc: "Monitore mensagens e comentários",
            icon: "📸",
            status: "via_zaia",
          },
          {
            name: "Meta Ads",
            desc: "Integre leads dos anúncios diretamente no CRM",
            icon: "📢",
            status: "soon",
          },
        ].map(({ name, desc, icon, status }) => (
          <div key={name} className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{name}</h3>
                  {status === "soon" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Em breve</span>
                  )}
                  {status === "via_zaia" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Via Zaia</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
            {status === "soon" ? (
              <button disabled className="w-full h-8 rounded-lg bg-muted text-xs text-muted-foreground cursor-not-allowed">
                Em breve
              </button>
            ) : (
              <button className="w-full h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
                Configurar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

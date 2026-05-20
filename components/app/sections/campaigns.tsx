"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Megaphone, Plus, CheckCircle2, Clock, XCircle, Send,
  ChevronRight, Sparkles, Users, Target, MessageCircle, Star
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: "Rascunho", color: "text-muted-foreground", bg: "bg-muted/50", icon: Clock },
  scheduled: { label: "Agendada", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  active: { label: "Ativa", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  finished: { label: "Finalizada", color: "text-muted-foreground", bg: "bg-muted/30", icon: CheckCircle2 },
  canceled: { label: "Cancelada", color: "text-red-500", bg: "bg-red-50", icon: XCircle },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  reativacao: "Reativar clientes sumidas",
  agenda_vazia: "Preencher agenda vazia",
  ticket_medio: "Aumentar ticket médio",
  primeira_visita: "Converter novas clientes",
  aniversario: "Aniversariantes",
  pos_atendimento: "Pós-atendimento",
  indicacao: "Indicação de amigas",
  servico_parado: "Promover serviço",
};

type Campaign = {
  id: string;
  name: string;
  objective: string;
  channel: string;
  status: string;
  message: string;
  generated_by_ai: boolean;
  recipients_count: number;
  sent_count: number;
  responded_count: number;
  booked_count: number;
  estimated_revenue: number;
  created_at: string;
};

const OBJECTIVES = [
  { value: "reativacao", label: "Reativar clientes sumidas", icon: "💕" },
  { value: "agenda_vazia", label: "Preencher agenda vazia", icon: "📅" },
  { value: "ticket_medio", label: "Aumentar ticket médio", icon: "💰" },
  { value: "primeira_visita", label: "Converter novas clientes", icon: "⭐" },
  { value: "aniversario", label: "Aniversariantes", icon: "🎂" },
  { value: "pos_atendimento", label: "Pós-atendimento", icon: "💆" },
  { value: "indicacao", label: "Indicação", icon: "🤝" },
  { value: "servico_parado", label: "Promover serviço", icon: "✨" },
];

const AUDIENCES = [
  { value: "all", label: "Todas as clientes" },
  { value: "inactive", label: "Clientes sumidas (45+ dias)" },
  { value: "vip", label: "Clientes VIP" },
  { value: "new", label: "Clientes novas" },
  { value: "hot", label: "Clientes quentes" },
  { value: "birthday", label: "Aniversariantes do mês" },
];

function CreateCampaignWizard({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    objective: "",
    audience: "",
    channel: "whatsapp",
    offer_type: "desconto",
    offer_description: "",
    message: "",
    generated_by_ai: true,
  });
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateMessage = async () => {
    setGeneratingMessage(true);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "campaign",
          question: `Crie uma mensagem de campanha para: ${OBJECTIVE_LABELS[form.objective] || form.objective}`,
        }),
      });
      const data = await res.json();
      const msg = data.response?.message || data.response?.action || "";
      if (msg) setForm(f => ({ ...f, message: msg }));
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || `Campanha ${OBJECTIVE_LABELS[form.objective]}`,
          objective: form.objective,
          channel: form.channel,
          offer_type: form.offer_type,
          offer_description: form.offer_description,
          message: form.message,
          generated_by_ai: form.generated_by_ai,
        }),
      });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Criar Campanha</h2>
              <p className="text-xs text-muted-foreground">Passo {step} de 3</p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Qual o objetivo da campanha?</h3>
              <div className="grid grid-cols-2 gap-2">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj.value}
                    onClick={() => setForm(f => ({ ...f, objective: obj.value }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.objective === obj.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30 hover:bg-primary/3"
                    }`}
                  >
                    <p className="text-base mb-1">{obj.icon}</p>
                    <p className="text-xs font-medium text-foreground leading-tight">{obj.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Quem vai receber?</h3>
              <div className="space-y-2">
                {AUDIENCES.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setForm(f => ({ ...f, audience: a.value }))}
                    className={`w-full p-3 rounded-xl border text-left text-sm transition-all flex items-center gap-3 ${
                      form.audience === a.value
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      form.audience === a.value ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {form.audience === a.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Mensagem da campanha</h3>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome da campanha</label>
                <input
                  type="text"
                  placeholder={`Campanha ${OBJECTIVE_LABELS[form.objective] || ""}`}
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
                  <button
                    onClick={generateMessage}
                    disabled={generatingMessage}
                    className="flex items-center gap-1.5 text-xs text-violet-600 font-medium hover:underline disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {generatingMessage ? "Gerando..." : "Gerar com IA"}
                  </button>
                </div>
                <textarea
                  placeholder="Oi, {{nome}}! 💕 Sua mensagem aqui..."
                  value={form.message}
                  onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">Use {"{{nome}}"} para personalizar com o nome da cliente</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            {step === 1 ? "Cancelar" : "Voltar"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !form.objective : !form.audience}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              Próximo
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !form.message}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? "Salvando..." : "Criar campanha"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CampaignsSection() {
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const { data, mutate } = useSWR(`/api/campaigns?status=${statusFilter}`, fetcher);
  const campaigns: Campaign[] = data?.campaigns || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">{campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all glow-primary"
        >
          <Plus className="w-4 h-4" />
          Criar campanha
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {[{ value: "", label: "Todas" }, { value: "active", label: "Ativas" }, { value: "draft", label: "Rascunho" }, { value: "finished", label: "Finalizadas" }].map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value === statusFilter ? "" : f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/30 text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Campaign cards */}
      {campaigns.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center">
          <Megaphone className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-medium text-muted-foreground mb-2">Nenhuma campanha ainda</p>
          <p className="text-sm text-muted-foreground/60 mb-4">Crie sua primeira campanha para começar a chamar clientes</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            const responseRate = campaign.sent_count > 0
              ? Math.round((campaign.responded_count / campaign.sent_count) * 100)
              : 0;

            return (
              <div key={campaign.id} className="metric-card group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {campaign.generated_by_ai && (
                        <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-foreground truncate">{campaign.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{OBJECTIVE_LABELS[campaign.objective] || campaign.objective}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusConfig.bg} ${statusConfig.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                </div>

                {/* Message preview */}
                {campaign.message && (
                  <div className="bg-muted/50 rounded-xl p-3 mb-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{campaign.message}"</p>
                  </div>
                )}

                {/* Metrics */}
                {campaign.sent_count > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-base font-bold text-foreground">{campaign.sent_count}</p>
                      <p className="text-[10px] text-muted-foreground">Enviadas</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-primary">{responseRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Resposta</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-green-600">{campaign.booked_count}</p>
                      <p className="text-[10px] text-muted-foreground">Agendou</p>
                    </div>
                  </div>
                )}

                {parseFloat(String(campaign.estimated_revenue || 0)) > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Receita estimada</span>
                    <span className="text-sm font-semibold text-green-600">R$ {parseFloat(String(campaign.estimated_revenue)).toFixed(0)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateCampaignWizard onClose={() => setShowCreate(false)} onSave={() => mutate()} />
      )}
    </div>
  );
}

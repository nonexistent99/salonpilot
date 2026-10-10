"use client";

import { InstagramSettings } from "@/components/app/instagram-settings";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Plug,
  CheckCircle2,
  Loader2,
  Webhook,
  Key,
  MessageCircle,
  QrCode,
  RefreshCw,
  Unplug,
} from "lucide-react";

export function IntegrationsSection() {
  const { mutate } = useSWRConfig();
  const { data } = useSWR("/api/whatsapp/accounts", fetcher, {
    refreshInterval: 30000,
  });
  const accounts = data?.accounts || [];
  const [form, setForm] = useState({
    instance_name: "",
    phone_number: "",
    evolution_base_url: "",
    api_key: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [qr, setQr] = useState<Record<string, unknown> | string | null>(null);

  async function createAccount() {
    if (!form.instance_name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/whatsapp/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível criar a conexão.");
      setForm({
        instance_name: "",
        phone_number: "",
        evolution_base_url: "",
        api_key: "",
      });
      await mutate("/api/whatsapp/accounts");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function connect(id: string) {
    setConnectingId(id);
    setError("");
    try {
      const res = await fetch(`/api/whatsapp/accounts/${id}/connect`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível conectar.");
      setQr(data.qr_code || null);
      await mutate("/api/whatsapp/accounts");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnectingId(null);
    }
  }

  async function refreshStatus(id: string) {
    await fetch(`/api/whatsapp/accounts/${id}/status`);
    await mutate("/api/whatsapp/accounts");
  }

  async function disconnect(id: string) {
    await fetch(`/api/whatsapp/accounts/${id}/disconnect`, { method: "POST" });
    await mutate("/api/whatsapp/accounts");
  }

  const qrImage =
    typeof qr === "string"
      ? qr
      : (qr as any)?.base64 || (qr as any)?.qrcode?.base64;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Conecte seus canais e personalize o atendimento da Bella
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <InstagramSettings />
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground">
                WhatsApp / Evolution API
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Transporte
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte seu número para receber mensagens, responder com a Bella e
              acompanhar o atendimento na caixa de entrada.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Nome da instância
            </label>
            <input
              value={form.instance_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instance_name: event.target.value,
                }))
              }
              placeholder="salao-principal"
              className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Número WhatsApp
            </label>
            <input
              value={form.phone_number}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone_number: event.target.value,
                }))
              }
              placeholder="5511999999999"
              className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Evolution Base URL
            </label>
            <input
              value={form.evolution_base_url}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  evolution_base_url: event.target.value,
                }))
              }
              placeholder="https://evolution.seudominio.com"
              className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              API Key da instância
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={form.api_key}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    api_key: event.target.value,
                  }))
                }
                placeholder="Opcional se usar chave global no admin"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-sm"
              />
            </div>
          </div>
        </div>

        <button
          onClick={createAccount}
          disabled={saving || !form.instance_name.trim()}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plug className="w-4 h-4" />
          )}
          Criar instância
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {accounts.map((account: any) => (
          <div key={account.id} className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  {account.instance_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {account.phone_number || "sem número"} · {account.status}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {account.provider}
              </span>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Webhook className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <code className="text-xs text-primary break-all">
                  {account.webhook_url ||
                    `${typeof window !== "undefined" ? window.location.origin : "https://app.salonpilot.com"}/api/webhooks/evolution/${account.id}`}
                </code>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => connect(account.id)}
                disabled={connectingId === account.id}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {connectingId === account.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <QrCode className="w-3.5 h-3.5" />
                )}
                Conectar QR
              </button>
              <button
                onClick={() => refreshStatus(account.id)}
                className="h-9 px-3 rounded-lg border border-border text-xs font-medium flex items-center gap-2 hover:bg-muted"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Status
              </button>
              <button
                onClick={() => disconnect(account.id)}
                className="h-9 px-3 rounded-lg border border-border text-xs font-medium flex items-center gap-2 hover:bg-muted"
              >
                <Unplug className="w-3.5 h-3.5" />
                Desconectar
              </button>
            </div>
          </div>
        ))}
      </div>

      {qr && (
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> QR retornado pela
            Evolution
          </h2>
          {typeof qrImage === "string" &&
          /^data:image\/(png|jpeg|webp);base64,/.test(qrImage) ? (
            <img
              src={qrImage}
              alt="QR Code para conectar seu WhatsApp"
              width={256}
              height={256}
            />
          ) : (
            <p className="text-sm">
              QR indisponível. Verifique o status ou solicite novamente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { KeyRound, Save, Loader2, ShieldCheck } from "lucide-react";

const DEFAULT_SETTINGS = [
  { key: "OPENAI_API_KEY", label: "OpenAI API Key", secret: true, description: "Chave principal da IA" },
  { key: "OPENAI_MODEL_FAST", label: "Modelo rapido", secret: false, description: "Ex: gpt-4o-mini" },
  { key: "OPENAI_MODEL_STRATEGIC", label: "Modelo estrategico", secret: false, description: "Ex: gpt-4o" },
  { key: "EVOLUTION_BASE_URL", label: "Evolution Base URL", secret: false, description: "URL base da Evolution API" },
  { key: "EVOLUTION_GLOBAL_API_KEY", label: "Evolution API Key global", secret: true, description: "Chave global da Evolution" },
];

export default function AdminSettingsPage() {
  const { data, isLoading } = useSWR("/api/admin/settings", fetcher);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const settings = data?.settings || [];
  const byKey = new Map(settings.map((s: any) => [s.key, s]));

  async function save(item: (typeof DEFAULT_SETTINGS)[number]) {
    const value = values[item.key];
    if (!value) return;
    setSaving(item.key);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: item.key,
        value,
        is_secret: item.secret,
        description: item.description,
      }),
    });
    setValues((current) => ({ ...current, [item.key]: "" }));
    await mutate("/api/admin/settings");
    setSaving(null);
  }

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chaves, IA e Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">Segredos sao salvos criptografados e nunca aparecem completos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DEFAULT_SETTINGS.map((item) => {
          const existing: any = byKey.get(item.key);
          return (
            <div key={item.key} className="glass-card rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  {item.secret ? <ShieldCheck className="w-4 h-4 text-primary" /> : <KeyRound className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{item.label}</h2>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  {existing && (
                    <p className="text-xs text-primary mt-1">Atual: {String(existing.value ?? "configurado")}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type={item.secret ? "password" : "text"}
                  value={values[item.key] || ""}
                  onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))}
                  placeholder={item.secret ? "Cole novo valor para substituir" : "Novo valor"}
                  className="flex-1 h-10 px-3 rounded-lg bg-input border border-border text-sm"
                />
                <button
                  onClick={() => save(item)}
                  disabled={saving === item.key || !values[item.key]}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === item.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

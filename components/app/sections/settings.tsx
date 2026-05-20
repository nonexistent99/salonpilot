"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Settings, Save, Scissors, Users, MapPin, Phone, Instagram, Briefcase, CheckCircle2 } from "lucide-react";

const NICHES = [
  { value: "cabelo", label: "Cabelo" },
  { value: "unhas", label: "Unhas / Manicure" },
  { value: "estetica", label: "Estética" },
  { value: "sobrancelha", label: "Sobrancelha" },
  { value: "maquiagem", label: "Maquiagem" },
  { value: "clinica", label: "Clínica de Beleza" },
  { value: "completo", label: "Salão Completo" },
];

const GOALS = [
  { value: "mais_clientes", label: "Conseguir mais clientes" },
  { value: "reter_clientes", label: "Fazer clientes voltarem" },
  { value: "ticket_medio", label: "Aumentar ticket médio" },
  { value: "organizar", label: "Organizar o atendimento" },
  { value: "lotar_agenda", label: "Lotar a agenda" },
  { value: "instagram", label: "Melhorar o Instagram" },
];

export function SettingsSection() {
  const { data: salon, mutate } = useSWR("/api/salons/me", fetcher);
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize form when salon data loads
  if (salon && !form) {
    setForm({
      name: salon.name || "",
      owner_name: salon.owner_name || "",
      phone: salon.phone || "",
      email: salon.email || "",
      city: salon.city || "",
      instagram: salon.instagram || "",
      niche: salon.niche || "completo",
      goal: salon.goal || "mais_clientes",
    });
  }

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await fetch("/api/salons/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm(f => f ? { ...f, [key]: value } : null);
  };

  if (!form) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded-xl w-48" />
        <div className="glass-card rounded-xl p-6 space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Dados do salão e preferências</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all glow-primary"
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</> : <><Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Salon data */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Scissors className="w-4.5 h-4.5 text-primary" />
            <h2 className="font-semibold text-foreground">Dados do Salão</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "name", label: "Nome do salão *", placeholder: "Studio Bella Rosa", icon: Scissors },
              { key: "owner_name", label: "Nome da responsável", placeholder: "Ana Paula Ferreira", icon: Users },
              { key: "phone", label: "WhatsApp do salão", placeholder: "(11) 99999-8888", icon: Phone },
              { key: "city", label: "Cidade", placeholder: "São Paulo", icon: MapPin },
              { key: "instagram", label: "Instagram", placeholder: "@studiobella", icon: Instagram },
            ].map(({ key, label, placeholder, icon: Icon }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={form[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4">
          {/* Niche */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4.5 h-4.5 text-primary" />
              <h2 className="font-semibold text-foreground">Nicho principal</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NICHES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update("niche", value)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                    form.niche === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4.5 h-4.5 text-primary" />
              <h2 className="font-semibold text-foreground">Objetivo principal</h2>
            </div>
            <div className="space-y-2">
              {GOALS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update("goal", value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all text-left flex items-center gap-3 ${
                    form.goal === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    form.goal === value ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {form.goal === value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

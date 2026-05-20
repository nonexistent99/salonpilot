"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  UserCircle, Mail, Building2, Target, DollarSign, Percent,
  Save, Loader2, CheckCircle2, MapPin, Sparkles, Camera,
} from "lucide-react";

export function ProfileSection() {
  const { data: profile, isLoading } = useSWR("/api/profile", fetcher);
  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [avgTicket, setAvgTicket] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [mainNiche, setMainNiche] = useState("");
  const [mainCity, setMainCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setAgencyName(profile.agencies?.name || "");
      setMonthlyGoal(String(profile.agencies?.monthly_goal || 10000));
      setAvgTicket(String(profile.agencies?.avg_ticket || 1500));
      setConversionRate(String(Number(profile.agencies?.conversion_rate || 0.3) * 100));
      setMainNiche(profile.agencies?.main_niche || "");
      setMainCity(profile.agencies?.main_city || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: name,
        agency_name: agencyName,
        monthly_goal: Number(monthlyGoal),
        avg_ticket: Number(avgTicket),
        conversion_rate: Number(conversionRate) / 100,
        main_niche: mainNiche || null,
        main_city: mainCity || null,
      }),
    });
    mutate("/api/profile");
    mutate("/api/dashboard");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = name
    ? name.split(" ").map((n) => n.charAt(0).toUpperCase()).slice(0, 2).join("")
    : "U";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto flex flex-col gap-6"
    >
      {/* Avatar + quick stats */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/80 to-chart-2 flex items-center justify-center ring-4 ring-primary/10">
              <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-lg font-semibold text-foreground">{name || "Usuário"}</h3>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">
                <Building2 className="w-3 h-3" />
                {agencyName}
              </span>
              {mainNiche && (
                <span className="inline-flex items-center gap-1 text-xs text-chart-2 bg-chart-2/10 px-2.5 py-1 rounded-full font-medium">
                  <Sparkles className="w-3 h-3" />
                  {mainNiche}
                </span>
              )}
              {mainCity && (
                <span className="inline-flex items-center gap-1 text-xs text-warning bg-warning/10 px-2.5 py-1 rounded-full font-medium">
                  <MapPin className="w-3 h-3" />
                  {mainCity}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6 text-center">
            <div>
              <p className="text-xl font-bold text-foreground">R$ {Number(monthlyGoal).toLocaleString("pt-BR")}</p>
              <p className="text-[10px] text-muted-foreground">Meta Mensal</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-xl font-bold text-foreground capitalize">{profile?.subscription?.plan || "free"}</p>
              <p className="text-[10px] text-muted-foreground">Plano</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">
          Informações Pessoais
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome completo</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={profile?.email || ""} disabled className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground cursor-not-allowed transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome da agência</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nicho principal</label>
              <div className="relative">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={mainNiche} onChange={(e) => setMainNiche(e.target.value)} placeholder="Ex: Restaurantes" className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cidade principal</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={mainCity} onChange={(e) => setMainCity(e.target.value)} placeholder="Ex: São Paulo" className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business settings */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">
          Configurações de Meta
        </h3>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Meta mensal (R$)</label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ticket médio (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" value={avgTicket} onChange={(e) => setAvgTicket(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Taxa conversão (%)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="number" value={conversionRate} onChange={(e) => setConversionRate(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="self-end h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Salvo!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

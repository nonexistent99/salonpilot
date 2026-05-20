"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, DollarSign, Percent, Users, MapPin, Briefcase,
  ArrowRight, ArrowLeft, CheckCircle2, X, Loader2, Sparkles
} from "lucide-react";
import { mutate } from "swr";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form data
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [avgTicket, setAvgTicket] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [meetingsPerMonth, setMeetingsPerMonth] = useState("");
  const [mainNiche, setMainNiche] = useState("");
  const [mainCity, setMainCity] = useState("");

  const goalNum = Number(monthlyGoal) || 0;
  const ticketNum = Number(avgTicket) || 0;
  const convNum = Number(conversionRate) || 20;
  const salesNeeded = ticketNum > 0 ? Math.ceil(goalNum / ticketNum) : 0;
  const meetingsNeeded = convNum > 0 ? Math.ceil(salesNeeded / (convNum / 100)) : 0;
  const schedulingRate = 10; // 10% default
  const leadsNeeded = meetingsNeeded > 0 ? Math.ceil(meetingsNeeded / (schedulingRate / 100)) : 0;

  const steps = [
    {
      title: "Meta de Faturamento",
      subtitle: "Quanto você quer faturar por mês com sua agência?",
      icon: Target,
      color: "text-primary",
      bg: "bg-primary/10",
      content: (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground">Meta mensal (R$)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              value={monthlyGoal}
              onChange={(e) => setMonthlyGoal(e.target.value)}
              placeholder="Ex: 50000"
              autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          {goalNum > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Meta: <span className="text-foreground font-medium">R$ {goalNum.toLocaleString("pt-BR")}</span>/mês
            </p>
          )}
        </div>
      ),
      valid: goalNum > 0,
    },
    {
      title: "Ticket Médio",
      subtitle: "Qual o valor médio dos seus contratos?",
      icon: DollarSign,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      content: (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground">Ticket médio (R$)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              value={avgTicket}
              onChange={(e) => setAvgTicket(e.target.value)}
              placeholder="Ex: 2500"
              autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          {ticketNum > 0 && goalNum > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Você precisa fechar <span className="text-foreground font-medium">{salesNeeded} vendas</span> por mês
            </p>
          )}
        </div>
      ),
      valid: ticketNum > 0,
    },
    {
      title: "Taxa de Conversão",
      subtitle: "Qual a porcentagem de reuniões que viram vendas?",
      icon: Percent,
      color: "text-warning",
      bg: "bg-warning/10",
      content: (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground">Taxa de conversão (%)</label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              value={conversionRate}
              onChange={(e) => setConversionRate(e.target.value)}
              placeholder="20"
              autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-foreground text-lg font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {convNum > 0 ? (
              <>Você precisa de <span className="text-foreground font-medium">{meetingsNeeded} reuniões</span> por mês</>
            ) : (
              <>Não sabe? Usamos <span className="text-foreground font-medium">20%</span> como referência</>
            )}
          </p>
        </div>
      ),
      valid: true, // optional, defaults to 20%
    },
    {
      title: "Seu Nicho e Região",
      subtitle: "Qual nicho você mais atende e onde quer prospectar?",
      icon: MapPin,
      color: "text-success",
      bg: "bg-success/10",
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nicho principal</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={mainNiche}
                onChange={(e) => setMainNiche(e.target.value)}
                placeholder="Ex: Restaurantes, Clínicas, Academias"
                autoFocus
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cidade/Região</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={mainCity}
                onChange={(e) => setMainCity(e.target.value)}
                placeholder="Ex: São Paulo, Belo Horizonte"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </div>
      ),
      valid: true, // optional
    },
    {
      title: "Seu Plano de Ação",
      subtitle: "Veja o que você precisa fazer para bater sua meta",
      icon: Sparkles,
      color: "text-primary",
      bg: "bg-primary/10",
      content: (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <p className="text-2xl font-bold text-primary">{salesNeeded}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vendas/mês</p>
            </div>
            <div className="p-3 rounded-xl bg-chart-2/5 border border-chart-2/10 text-center">
              <p className="text-2xl font-bold text-chart-2">{meetingsNeeded}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reuniões/mês</p>
            </div>
            <div className="p-3 rounded-xl bg-warning/5 border border-warning/10 text-center">
              <p className="text-2xl font-bold text-warning">{leadsNeeded}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Leads necessários</p>
            </div>
            <div className="p-3 rounded-xl bg-success/5 border border-success/10 text-center">
              <p className="text-2xl font-bold text-success">R$ {goalNum.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Meta mensal</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Você pode ajustar esses valores a qualquer momento no Perfil.
          </p>
        </div>
      ),
      valid: true,
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleComplete = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding_completed: true,
          monthly_goal: goalNum || 10000,
          avg_ticket: ticketNum || 1500,
          conversion_rate: (convNum || 20) / 100,
          main_niche: mainNiche || "",
          main_city: mainCity || "",
        }),
      });
      mutate("/api/profile");
      mutate("/api/dashboard");
    } catch {
      // Best effort
    }
    setSaving(false);
    onComplete();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg mx-4 glass-card rounded-2xl p-8 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step progress */}
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl ${currentStep.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${currentStep.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{currentStep.title}</h2>
                <p className="text-xs text-muted-foreground">{currentStep.subtitle}</p>
              </div>
            </div>

            {/* Content */}
            <div className="my-6">
              {currentStep.content}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 h-11 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!currentStep.valid || saving}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step === steps.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Começar a Usar
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Step counter */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Passo {step + 1} de {steps.length}
        </p>
      </motion.div>
    </motion.div>
  );
}

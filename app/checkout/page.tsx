"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ArrowLeft,
  Zap,
  Shield,
  Sparkles,
  Rocket,
  Crown,
  Gift,
  Search,
  Brain,
  Music,
  Calendar,
  Target,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    price: "R$ 97",
    priceValue: 97,
    period: "/mes",
    description: "Perfeito para comecar a prospectar leads qualificados",
    icon: Zap,
    color: "chart-2",
    features: [
      { text: "50 buscas de leads/mes", icon: Search },
      { text: "50 creditos de IA/mes", icon: Brain },
      { text: "3 jingles personalizados/mes", icon: Music },
      { text: "Agenda integrada", icon: Calendar },
      { text: "Scripts de vendas com IA", icon: Sparkles },
      { text: "Suporte por email", icon: Shield },
    ],
    limits: { searches: 50, aiCredits: 50, music: 3 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "R$ 197",
    priceValue: 197,
    period: "/mes",
    description: "Para equipes que querem escalar suas vendas",
    icon: Rocket,
    color: "primary",
    popular: true,
    features: [
      { text: "200 buscas de leads/mes", icon: Search },
      { text: "200 creditos de IA/mes", icon: Brain },
      { text: "10 jingles personalizados/mes", icon: Music },
      { text: "Agenda com lembretes", icon: Calendar },
      { text: "Analise premium de leads", icon: Target },
      { text: "Scripts avancados com IA", icon: Sparkles },
      { text: "Dashboard de metas", icon: Target },
      { text: "Suporte prioritario", icon: Shield },
    ],
    limits: { searches: 200, aiCredits: 200, music: 10 },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: "R$ 497",
    priceValue: 497,
    period: "/mes",
    description: "Solucao completa para agencias de alta performance",
    icon: Crown,
    color: "warning",
    features: [
      { text: "Buscas ilimitadas", icon: Search },
      { text: "Creditos de IA ilimitados", icon: Brain },
      { text: "Jingles ilimitados", icon: Music },
      { text: "Agenda com integracao", icon: Calendar },
      { text: "Analise premium ilimitada", icon: Target },
      { text: "API de integracao", icon: Zap },
      { text: "Relatorios avancados", icon: Target },
      { text: "Gerente de conta dedicado", icon: Shield },
      { text: "Onboarding personalizado", icon: Gift },
    ],
    limits: { searches: 99999, aiCredits: 99999, music: 99999 },
  },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get("plan") || "pro";
  const plan = PLANS[planId as keyof typeof PLANS] || PLANS.pro;
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Erro ao criar checkout");
        setLoading(false);
      }
    } catch {
      alert("Erro de conexao");
      setLoading(false);
    }
  };

  const Icon = plan.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">GrowthOS</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Plan Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    `bg-${plan.color}/10`
                  )}
                  style={{ backgroundColor: `hsl(var(--${plan.color}) / 0.1)` }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: `hsl(var(--${plan.color}))` }}
                  />
                </div>
                {"popular" in plan && plan.popular && (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    Mais Popular
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Plano {plan.name}
              </h1>
              <p className="text-muted-foreground">{plan.description}</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Tudo incluso no {plan.name}
              </h3>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-chart-1/10 flex items-center justify-center shrink-0">
                        <FeatureIcon className="w-4 h-4 text-chart-1" />
                      </div>
                      <span className="text-sm text-foreground">
                        {feature.text}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Garantia de 7 dias
              </h3>
              <p className="text-sm text-muted-foreground">
                Se nao ficar satisfeito nos primeiros 7 dias, devolvemos 100% do
                seu investimento. Sem perguntas.
              </p>
            </div>
          </motion.div>

          {/* Right: Checkout Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-24 h-fit"
          >
            <div className="p-8 rounded-2xl bg-card border border-border shadow-xl">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Resumo do pedido
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Plano</span>
                  <span className="font-medium text-foreground">
                    {plan.name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Cobranca</span>
                  <span className="font-medium text-foreground">Mensal</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Buscas</span>
                  <span className="font-medium text-foreground">
                    {plan.limits.searches === 99999
                      ? "Ilimitado"
                      : plan.limits.searches}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Creditos IA</span>
                  <span className="font-medium text-foreground">
                    {plan.limits.aiCredits === 99999
                      ? "Ilimitado"
                      : plan.limits.aiCredits}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between mb-8">
                <span className="text-muted-foreground">Total</span>
                <div className="text-right">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Redirecionando...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Assinar Agora
                  </>
                )}
              </Button>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-chart-1" />
                  Pagamento seguro
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-chart-1" />
                  Cancele quando quiser
                </span>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Ao continuar, voce concorda com nossos Termos de Servico e
                  Politica de Privacidade. O pagamento sera processado de forma
                  segura pelo Stripe.
                </p>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>SSL Seguro</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                <span>Stripe</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Compare Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <h2 className="text-xl font-semibold text-foreground text-center mb-8">
            Compare os planos
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.values(PLANS).map((p) => {
              const PlanIcon = p.icon;
              const isSelected = p.id === plan.id;
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/checkout?plan=${p.id}`)}
                  className={cn(
                    "p-6 rounded-xl border text-left transition-all",
                    isSelected
                      ? "bg-primary/5 border-primary ring-2 ring-primary/20"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `hsl(var(--${p.color}) / 0.1)`,
                      }}
                    >
                      <PlanIcon
                        className="w-5 h-5"
                        style={{ color: `hsl(var(--${p.color}))` }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.price}
                        {p.period}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                      <Check className="w-3 h-3" />
                      Selecionado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Check,
  Zap,
  Rocket,
  Crown,
  Loader2,
  Coins,
  ArrowDown,
  ArrowUp,
  Gift,
  ShoppingCart,
} from "lucide-react";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 97",
    period: "/mes",
    icon: Zap,
    description: "Para quem esta comecando no marketing local",
    features: [
      "50 buscas por mes",
      "50 creditos de IA",
      "Agenda simples",
      "Suporte por e-mail",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 197",
    period: "/mes",
    icon: Rocket,
    description: "Para agencias em crescimento",
    popular: true,
    features: [
      "200 buscas por mes",
      "200 creditos de IA",
      "Score de oportunidade com IA",
      "Scripts automaticos de venda",
      "Dashboard de metas",
      "Suporte prioritario",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "R$ 497",
    period: "/mes",
    icon: Crown,
    description: "Para agencias consolidadas",
    features: [
      "Buscas ilimitadas",
      "IA avancada ilimitada",
      "Multi-usuarios",
      "API de integracao",
      "Relatorios avancados",
      "Gerente de conta dedicado",
    ],
  },
];

const creditPackages = [
  { id: "credits-100", credits: 100, price: "R$ 29", perCredit: "R$ 0,29" },
  { id: "credits-300", credits: 300, price: "R$ 69", perCredit: "R$ 0,23", popular: true },
  { id: "credits-600", credits: 600, price: "R$ 119", perCredit: "R$ 0,20" },
  { id: "credits-1200", credits: 1200, price: "R$ 199", perCredit: "R$ 0,17" },
];

type Transaction = {
  id: string;
  amount: number;
  type: "purchase" | "usage" | "refund" | "bonus";
  action?: string;
  description?: string;
  created_at: string;
};

export function BillingSection() {
  const router = useRouter();
  const { data: profile } = useSWR("/api/profile", fetcher);
  const { data: creditData } = useSWR("/api/billing/credits", fetcher);
  const currentPlan = profile?.subscription?.plan || "free";
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [tab, setTab] = useState<"plans" | "credits">("plans");

  const balance = creditData?.balance ?? 0;
  const lifetimePurchased = creditData?.lifetimePurchased ?? 0;
  const lifetimeUsed = creditData?.lifetimeUsed ?? 0;
  const transactions: Transaction[] = creditData?.recentTransactions ?? [];

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan) return;
    router.push(`/checkout?plan=${planId}`);
  };

  const handleBuyCredits = async (packageId: string) => {
    setLoadingPackage(packageId);
    try {
      const res = await fetch("/api/billing/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoadingPackage(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      {/* Current plan + credit balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Plano Atual</h3>
          <p className="text-sm text-muted-foreground">
            Voce esta no plano{" "}
            <span className="text-primary font-semibold capitalize">{currentPlan}</span>
          </p>
          {profile?.subscription?.plan !== "free" && (
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-medium inline-block">
              Ativo
            </div>
          )}
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-foreground">Saldo de Creditos</h3>
            <Coins className="w-5 h-5 text-warning" />
          </div>
          <p className="text-3xl font-bold text-foreground">{balance}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Comprados: {lifetimePurchased}</span>
            <span>Usados: {lifetimeUsed}</span>
          </div>
        </div>
      </div>



      {/* Tab switch */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 self-start">
        <button
          onClick={() => setTab("credits")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", tab === "credits" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          Comprar Creditos
        </button>
        <button
          onClick={() => setTab("plans")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", tab === "plans" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          Planos Mensais
        </button>
      </div>

      {tab === "credits" ? (
        <>
          {/* Credit packages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "glass-card rounded-xl p-5 transition-all duration-300 relative flex flex-col",
                  pkg.popular && "border-primary/40 bg-primary/5"
                )}
              >
                {pkg.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Melhor valor
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-5 h-5 text-warning" />
                  <span className="text-lg font-bold text-foreground">{pkg.credits}</span>
                  <span className="text-xs text-muted-foreground">creditos</span>
                </div>
                <div className="mb-1">
                  <span className="text-2xl font-bold text-foreground">{pkg.price}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{pkg.perCredit} por credito</p>
                <button
                  onClick={() => handleBuyCredits(pkg.id)}
                  disabled={loadingPackage === pkg.id}
                  className={cn(
                    "w-full h-10 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-auto",
                    pkg.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  {loadingPackage === pkg.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Comprar
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Transaction history */}
          {transactions.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Historico de Transacoes</h4>
              <div className="flex flex-col gap-2">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        tx.amount > 0 ? "bg-success/10" : "bg-destructive/10"
                      )}>
                        {tx.type === "purchase" ? (
                          <ShoppingCart className={cn("w-4 h-4", tx.amount > 0 ? "text-success" : "text-destructive")} />
                        ) : tx.type === "bonus" ? (
                          <Gift className="w-4 h-4 text-primary" />
                        ) : tx.amount > 0 ? (
                          <ArrowDown className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowUp className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{tx.description || tx.action || tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <span className={cn("text-sm font-semibold", tx.amount > 0 ? "text-success" : "text-destructive")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Plans grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "glass-card rounded-xl p-6 transition-all duration-300 relative flex flex-col",
                  isCurrent ? "border-primary/40 bg-primary/5" : "hover:border-border/60"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isCurrent ? "bg-primary/10" : "bg-secondary")}>
                    <Icon className={cn("w-5 h-5", isCurrent ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                <div className="mb-5">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <div className="flex flex-col gap-2.5 flex-1 mb-5">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className={cn("w-4 h-4 shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent}
                  className={cn(
                    "w-full h-10 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                    isCurrent ? "bg-primary/10 text-primary cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {isCurrent ? "Plano Atual" : "Escolher Plano"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

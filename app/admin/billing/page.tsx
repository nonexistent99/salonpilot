"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Package,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Subscription {
  agency_id: string;
  agency_name: string;
  plan: string;
  status: string;
  monthly_value: number;
  searches_used: number;
  searches_limit: number;
  ai_credits_used: number;
  ai_credits_limit: number;
  current_period_end: string;
  created_at: string;
}

interface BillingData {
  totalActive: number;
  totalInactive: number;
  mrr: number;
  revenuePerPlan: Record<string, { count: number; revenue: number }>;
  subscriptions: Subscription[];
}

export default function AdminBillingPage() {
  const { data, isLoading } = useSWR<BillingData>("/api/admin/billing", fetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const d = data || {
    totalActive: 0,
    totalInactive: 0,
    mrr: 0,
    revenuePerPlan: {},
    subscriptions: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Metricas de receita e assinaturas
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {(d.mrr ?? 0).toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita Mensal Recorrente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assinaturas Ativas
            </CardTitle>
            <Users className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {d.totalActive ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Planos pagos ativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inativos
            </CardTitle>
            <DollarSign className="w-4 h-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {d.totalInactive ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assinaturas inativas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Medio
            </CardTitle>
            <CreditCard className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R${" "}
              {(d.totalActive ?? 0) > 0
                ? ((d.mrr ?? 0) / d.totalActive).toFixed(0)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por assinatura
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Distribuicao de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(d.revenuePerPlan ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(d.revenuePerPlan ?? {}).map(([plan, info]) => {
                  const total = Object.values(d.revenuePerPlan ?? {}).reduce(
                    (acc, x) => acc + x.count,
                    0
                  );
                  const pct = total > 0 ? (info.count / total) * 100 : 0;
                  return (
                    <div key={plan} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground capitalize">
                          {plan}
                        </span>
                        <span className="text-muted-foreground">
                          {info.count} ({pct.toFixed(0)}%) - R$ {info.revenue}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions List */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(d.subscriptions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma assinatura
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(d.subscriptions ?? []).slice(0, 10).map((s) => (
                  <div
                    key={s.agency_id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {s.agency_name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {s.plan} - {s.status}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-chart-1">
                      R$ {(s.monthly_value ?? 0).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

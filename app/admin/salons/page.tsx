"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Building2, Loader2 } from "lucide-react";

export default function AdminSalonsPage() {
  const { data, isLoading } = useSWR("/api/admin/salons", fetcher);
  const salons = data?.salons || [];

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saloes</h1>
        <p className="text-sm text-muted-foreground mt-1">{salons.length} saloes na plataforma</p>
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Salao</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Plano</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Usuarios</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Clientes</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Conversas</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Custo IA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {salons.map((salon: any) => (
              <tr key={salon.id} className="hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{salon.name}</p>
                      <p className="text-xs text-muted-foreground">{salon.city || "Sem cidade"} · {salon.email || "sem email"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{salon.plan || "free"}</td>
                <td className="px-4 py-3 text-sm text-right">{salon.users_count}</td>
                <td className="px-4 py-3 text-sm text-right">{salon.customers_count}</td>
                <td className="px-4 py-3 text-sm text-right">{salon.conversations_count}</td>
                <td className="px-4 py-3 text-sm text-right">US$ {Number(salon.ai_cost_usd || 0).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

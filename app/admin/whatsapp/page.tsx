"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Loader2, MessageCircle, Webhook } from "lucide-react";

export default function AdminWhatsappPage() {
  const { data, isLoading } = useSWR("/api/admin/whatsapp", fetcher, { refreshInterval: 30000 });
  const accounts = data?.accounts || [];
  const events = data?.recentEvents || [];

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp / Evolution</h1>
        <p className="text-sm text-muted-foreground mt-1">Status das instancias e ultimos webhooks recebidos</p>
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Instancia</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Salao</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Webhook</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((account: any) => (
              <tr key={account.id}>
                <td className="px-4 py-3 text-sm font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> {account.instance_name}</td>
                <td className="px-4 py-3 text-sm">{account.salon_name}</td>
                <td className="px-4 py-3 text-sm">{account.status} · {account.last_connection_state || "sem status"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground break-all">{account.webhook_url || "nao configurado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Webhook className="w-4 h-4 text-primary" /> Eventos recentes</h2>
        <div className="space-y-2">
          {events.map((event: any) => (
            <div key={event.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
              <span>{event.salon_name || "sem salao"} · {event.event_type || "evento"}</span>
              <span className={event.error_message ? "text-destructive" : "text-muted-foreground"}>
                {event.error_message || (event.processed ? "processado" : "pendente")} · {new Date(event.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

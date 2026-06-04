"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Phone,
  Search,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";

const STATUSES = [
  { value: "", label: "Todas" },
  { value: "active", label: "Abertas" },
  { value: "waiting_client", label: "Aguardando" },
  { value: "human_handoff", label: "Humano" },
  { value: "completed", label: "Encerradas" },
];

export function InboxSection() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useSWR(
    `/api/inbox/threads?status=${encodeURIComponent(status)}&q=${encodeURIComponent(search)}`,
    fetcher,
    { refreshInterval: 15000 }
  );
  const threads = data?.threads || [];

  useEffect(() => {
    if (!selectedId && threads.length > 0) setSelectedId(threads[0].id);
  }, [selectedId, threads]);

  const { data: detail } = useSWR(selectedId ? `/api/inbox/threads/${selectedId}` : null, fetcher, {
    refreshInterval: 15000,
  });
  const { data: messageData } = useSWR(selectedId ? `/api/inbox/threads/${selectedId}/messages` : null, fetcher, {
    refreshInterval: 8000,
  });
  const messages = messageData?.messages || [];

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    await fetch(`/api/inbox/threads/${selectedId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reply }),
    });
    setReply("");
    await mutate(`/api/inbox/threads/${selectedId}/messages`);
    setSending(false);
  }

  async function toggleAi(enabled: boolean) {
    if (!selectedId) return;
    await fetch(`/api/inbox/threads/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_enabled: enabled }),
    });
    await mutate(`/api/inbox/threads/${selectedId}`);
    await mutate(`/api/inbox/threads?status=${encodeURIComponent(status)}&q=${encodeURIComponent(search)}`);
  }

  async function handoff() {
    if (!selectedId) return;
    await fetch(`/api/inbox/threads/${selectedId}/handoff`, { method: "POST" });
    await mutate(`/api/inbox/threads/${selectedId}`);
  }

  async function closeThread() {
    if (!selectedId) return;
    await fetch(`/api/inbox/threads/${selectedId}/close`, { method: "POST" });
    await mutate(`/api/inbox/threads/${selectedId}`);
  }

  const thread = detail?.thread;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Inbox WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground">Conversas, IA, handoff e histórico do CRM</p>
        </div>
        {thread && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAi(!thread.ai_enabled)}
              className={`h-9 px-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                thread.ai_enabled ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              IA {thread.ai_enabled ? "ativa" : "desligada"}
            </button>
            <button onClick={handoff} className="h-9 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5" />
              Assumir
            </button>
            <button onClick={closeThread} className="h-9 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Encerrar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_300px] gap-4 min-h-[680px]">
        <div className="glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente ou telefone"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {STATUSES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setStatus(item.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                    status === item.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : threads.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada</div>
            ) : (
              threads.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/60 hover:bg-muted/40 ${
                    selectedId === item.id ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{item.customer_name || item.phone || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.last_message_content || "Sem mensagens"}</p>
                    </div>
                    <span className="text-[10px] rounded-md bg-secondary px-1.5 py-0.5 text-muted-foreground">{item.status}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden flex flex-col">
          {thread ? (
            <>
              <div className="h-14 border-b border-border px-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{thread.customer_name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {thread.phone || thread.customer_phone}</p>
                </div>
                <span className="text-xs text-muted-foreground">{thread.lead_stage || "new"}</span>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-muted/20">
                {messages.map((message: any) => {
                  const outbound = message.direction === "outbound";
                  return (
                    <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${
                        outbound ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{message.content || `[${message.message_type}]`}</p>
                        <p className={`text-[10px] mt-1 ${outbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {message.sender_type} · {new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Responder manualmente"
                  className="flex-1 min-h-10 max-h-28 px-3 py-2 rounded-lg bg-input border border-border text-sm resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="w-11 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                  title="Enviar"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Selecione uma conversa</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Cliente</h2>
            {thread ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Status:</span> {thread.lifecycle_status || thread.status}</p>
                <p><span className="text-muted-foreground">Servico:</span> {thread.service_name || "sem foco"}</p>
                <p><span className="text-muted-foreground">Ticket:</span> R$ {Number(thread.average_ticket || 0).toFixed(0)}</p>
                <p><span className="text-muted-foreground">Total:</span> R$ {Number(thread.total_spent || 0).toFixed(0)}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">Sem cliente selecionada</p>}
          </div>
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Tool calls</h2>
            <div className="space-y-2">
              {(detail?.tool_calls || []).slice(0, 8).map((call: any) => (
                <div key={`${call.name}-${call.created_at}`} className="flex items-center justify-between text-xs rounded-lg bg-secondary/40 px-2 py-1.5">
                  <span>{call.name}</span>
                  {call.status === "success" ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <XCircle className="w-3 h-3 text-destructive" />}
                </div>
              ))}
              {!detail?.tool_calls?.length && <p className="text-xs text-muted-foreground">Nenhuma tool chamada</p>}
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Memorias</h2>
            <div className="space-y-2">
              {(detail?.memories || []).map((memory: any) => (
                <div key={memory.id} className="text-xs rounded-lg bg-secondary/40 px-2 py-1.5">
                  <p className="font-medium">{memory.type}</p>
                  <p className="text-muted-foreground">{memory.content}</p>
                </div>
              ))}
              {!detail?.memories?.length && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Sem memorias ainda</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

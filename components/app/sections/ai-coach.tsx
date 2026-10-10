"use client";
import { useState, useEffect, useRef } from "react";
import { Brain, Send, Plus, Loader2, MessageCircle } from "lucide-react";
type Thread = { id: string; title: string };
type Message = { role: "user" | "assistant"; content: string };
async function jsonRequest(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.error || "Não foi possível conectar. Tente novamente.",
    );
  return data;
}
export function AICoachSection() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const pending = useRef<{ question: string; requestId: string } | null>(null);
  const operation = useRef(0);
  useEffect(() => {
    let active = true;
    jsonRequest("/api/ai/conversations")
      .then(async (data) => {
        if (!active) return;
        setThreads(data.threads);
        if (data.threads[0]) {
          const id = data.threads[0].id;
          const history = await jsonRequest(`/api/ai/conversations?id=${id}`);
          if (active) {
            setThreadId(id);
            setMessages(
              history.turns.flatMap((t: any) => [
                { role: "user", content: t.question },
                { role: "assistant", content: t.answer },
              ]),
            );
          }
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      operation.current++;
    };
  }, []);
  useEffect(
    () => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    [messages, busy],
  );
  async function select(id: string) {
    const seq = ++operation.current;
    setLoading(true);
    setError("");
    pending.current = null;
    try {
      const data = await jsonRequest(`/api/ai/conversations?id=${id}`);
      if (seq === operation.current) {
        setThreadId(id);
        setMessages(
          data.turns.flatMap((t: any) => [
            { role: "user", content: t.question },
            { role: "assistant", content: t.answer },
          ]),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (seq === operation.current) setLoading(false);
    }
  }
  async function send(question = input.trim()) {
    if (!question || busy || loading) return;
    setBusy(true);
    setError("");
    const seq = ++operation.current;
    if (pending.current?.question !== question)
      pending.current = { question, requestId: crypto.randomUUID() };
    try {
      let id = threadId;
      if (!id) {
        const data = await jsonRequest("/api/ai/conversations", {
          method: "POST",
        });
        id = data.thread.id;
        setThreadId(id);
        setThreads((t) => [data.thread, ...t]);
      }
      const data = await jsonRequest("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: id,
          request_id: pending.current!.requestId,
          question,
        }),
      });
      if (seq !== operation.current) return;
      setMessages((m) => [
        ...m,
        { role: "user", content: question },
        { role: "assistant", content: data.response },
      ]);
      setInput("");
      pending.current = null;
      setThreads((t) =>
        t.map((item) =>
          item.id === id && item.title === "Nova conversa"
            ? { ...item, title: question.slice(0, 80) }
            : item,
        ),
      );
    } catch (e) {
      if (seq === operation.current) setError((e as Error).message);
    } finally {
      if (seq === operation.current) setBusy(false);
    }
  }
  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] max-h-[900px] gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="text-violet-500" />
            Bella IA
          </h1>
          <p className="text-xs text-muted-foreground">
            Converse sobre sua empresa. Seu histórico fica privado na sua conta.
          </p>
        </div>
        <button
          disabled={busy || loading}
          onClick={() => {
            operation.current++;
            setThreadId(null);
            setMessages([]);
            setError("");
            pending.current = null;
          }}
          className="border rounded-xl p-2 text-sm flex gap-2 disabled:opacity-50"
        >
          <Plus size={16} />
          Nova conversa
        </button>
      </div>
      {threads.length > 0 && (
        <select
          aria-label="Histórico de conversas"
          value={threadId || ""}
          disabled={busy || loading}
          onChange={(e) => e.target.value && select(e.target.value)}
          className="bg-card border rounded-xl p-2 text-sm"
        >
          <option value="">Nova conversa</option>
          {threads.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      )}
      <div className="flex-1 overflow-y-auto space-y-4" aria-live="polite">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Carregando conversa...
          </p>
        ) : messages.length === 0 ? (
          <div className="glass-card rounded-xl p-5">
            <MessageCircle className="text-violet-500 mb-3" />
            <p>
              Olá! Sou a Bella. Posso ajudar você a entender os dados do seu
              negócio e transformar dúvidas em um plano de ação. O que vamos
              analisar?
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                "Quais são minhas prioridades esta semana?",
                "Como melhorar a recorrência?",
                "Analise meu posicionamento no Instagram",
              ].map((q) => (
                <button
                  key={q}
                  disabled={busy}
                  onClick={() => send(q)}
                  className="border rounded-lg p-2 text-xs hover:bg-muted"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : ""}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-4 text-sm whitespace-pre-wrap break-words ${m.role === "user" ? "bg-primary text-primary-foreground" : "glass-card"}`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {busy && (
          <p className="text-sm flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} />
            Bella está preparando sua resposta...
          </p>
        )}
        <div ref={end} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error} Sua pergunta foi mantida para tentar novamente.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <textarea
          aria-label="Mensagem para Bella"
          maxLength={4000}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Pergunte sobre o seu negócio..."
          disabled={busy || loading}
          className="flex-1 bg-card border rounded-xl p-3 text-sm resize-none"
        />
        <button
          aria-label="Enviar mensagem"
          disabled={busy || loading || !input.trim()}
          className="bg-primary text-primary-foreground rounded-xl px-4 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

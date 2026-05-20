"use client";

import { useState, useRef, useEffect } from "react";

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Brain, Send, Sparkles, Loader2, User, MessageCircle,
  Lightbulb, TrendingUp, Target, Calendar, Star, RotateCcw
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsed?: {
    diagnosis?: string;
    reason?: string;
    action?: string;
    message?: string;
    metric?: string;
  };
  timestamp: Date;
};

const QUICK_QUESTIONS = [
  { icon: TrendingUp, text: "O que faço hoje para vender mais?" },
  { icon: Target, text: "Quais clientes devo chamar?" },
  { icon: Calendar, text: "Como preencher horários vazios?" },
  { icon: Sparkles, text: "Qual campanha fazer essa semana?" },
  { icon: Star, text: "Como aumentar meu ticket médio?" },
  { icon: Lightbulb, text: "O que postar hoje no Instagram?" },
];

export function AICoachSection() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou a Bella IA, sua consultora de crescimento para salão. Analiso os dados do seu salão em tempo real e te digo exatamente o que fazer para vender mais. O que você quer saber?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (question?: string) => {
    const text = question || input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: genId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();
      let response = data.response;

      // If response is a raw string (JSON from Gemini wrapped in string), try to parse it
      if (typeof response === "string") {
        try {
          // strip possible ```json ... ``` markdown fence
          const cleaned = response.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
          response = JSON.parse(cleaned);
        } catch {
          // Not JSON — treat as plain text diagnosis
          response = { diagnosis: response };
        }
      }

      // If response has a nested "diagnosis" that is itself a JSON string, unwrap it
      if (response?.diagnosis && typeof response.diagnosis === "string" && response.diagnosis.trim().startsWith("{")) {
        try {
          const inner = JSON.parse(response.diagnosis);
          if (inner.diagnosis) response = inner;
        } catch { /* keep as-is */ }
      }

      const assistantMessage: Message = {
        id: genId(),
        role: "assistant",
        content: response?.diagnosis || "Analisando dados do seu salão...",
        parsed: response && typeof response === "object" ? response : undefined,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [...prev, {
        id: genId(),
        role: "assistant",
        content: "Desculpe, não consegui conectar agora. Tente novamente em instantes.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };


  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou a Bella IA, sua consultora de crescimento para salão. O que você quer saber?",
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center glow-ai">
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              Bella IA
              <Sparkles className="w-4 h-4 text-violet-500" />
            </h1>
            <p className="text-xs text-muted-foreground">Sua consultora de crescimento para salão</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Nova conversa
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              msg.role === "user"
                ? "bg-primary/10"
                : "bg-violet-500/10 glow-ai"
            }`}>
              {msg.role === "user"
                ? <User className="w-4 h-4 text-primary" />
                : <Brain className="w-4 h-4 text-violet-600" />
              }
            </div>

            {/* Message bubble */}
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              {msg.role === "assistant" && msg.parsed ? (
                // Formatted AI response
                <div className="space-y-2">
                  {msg.parsed.diagnosis && (
                    <div className="glass-card rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-xs font-semibold text-violet-600">Diagnóstico</span>
                      </div>
                      <p className="text-sm text-foreground">{msg.parsed.diagnosis}</p>
                    </div>
                  )}
                  {msg.parsed.reason && (
                    <div className="glass-card rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">Por que importa</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{msg.parsed.reason}</p>
                    </div>
                  )}
                  {msg.parsed.action && (
                    <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Ação recomendada</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{msg.parsed.action}</p>
                    </div>
                  )}
                  {msg.parsed.message && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Mensagem pronta para usar</span>
                      </div>
                      <p className="text-sm text-green-800 italic">"{msg.parsed.message}"</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.parsed!.message!)}
                        className="mt-2 text-xs text-green-700 hover:underline"
                      >
                        Copiar mensagem
                      </button>
                    </div>
                  )}
                  {msg.parsed.metric && (
                    <div className="glass-card rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{msg.parsed.metric}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "glass-card text-foreground rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground/60 px-1">
                {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-600" />
            </div>
            <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
              <span className="text-sm text-muted-foreground">Analisando dados do seu salão...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions (only show when only welcome message) */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {QUICK_QUESTIONS.map((q, i) => {
            const Icon = q.icon;
            return (
              <button
                key={i}
                onClick={() => sendMessage(q.text)}
                className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-violet-300 hover:bg-violet-500/5 transition-all text-left group"
              >
                <Icon className="w-3.5 h-3.5 text-violet-500 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                  {q.text}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Pergunte qualquer coisa sobre seu salão..."
          disabled={loading}
          className="flex-1 h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 glow-ai"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

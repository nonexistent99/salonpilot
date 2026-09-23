"use client";
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Brain, Instagram, Loader2, RefreshCw, Target } from "lucide-react";
async function request(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, credentials: "include" });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Não foi possível concluir.");
  return d;
}
export function StrategySection() {
  const { data, mutate } = useSWR("/api/ai/strategy", fetcher, {
    revalidateOnFocus: false,
  });
  const { data: social, mutate: refreshSocial } = useSWR(
    "/api/integrations/instagram",
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: jobs, mutate: refreshJobs } = useSWR(
    "/api/integrations/instagram/scrape",
    fetcher,
    { revalidateOnFocus: false },
  );
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState("");
  async function action(type: string, url: string, method = "POST") {
    setBusy(type);
    setError("");
    setNotice("");
    try {
      const result = await request(url, { method });
      await Promise.all([mutate(), refreshSocial(), refreshJobs()]);
      if (type === "strategy") setSelected(result.id);
      if (result.status === "failed")
        setError("A coleta não foi concluída. Confira se o perfil é público.");
      else if (result.status === "running")
        setNotice(
          "Coleta em andamento. Use “Verificar coleta” em alguns instantes.",
        );
      else setNotice("Dados salvos.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const reports = data?.reports || [];
  const saved = reports.find((r: any) => r.id === selected) || reports[0];
  const report = saved?.report;
  const snapshot = social?.snapshot;
  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold flex gap-2 items-center">
          <Target />
          Estratégia do negócio
        </h1>
        <p className="text-sm text-muted-foreground">
          Diagnóstico e plano de ação com os dados registrados da sua empresa.
        </p>
      </div>
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h2 className="font-semibold flex gap-2 items-center">
          <Instagram size={18} />
          Posicionamento no Instagram
        </h2>
        <p className="text-sm text-muted-foreground">
          Colete o perfil cadastrado nas configurações do salão. A análise usa
          uma amostra de publicações e informa o que não pôde verificar.
        </p>
        {snapshot ? (
          <p className="text-sm">
            @{snapshot.username} · {snapshot.posts?.length || 0} publicações ·
            coletado em{" "}
            {new Date(snapshot.collected_at).toLocaleString("pt-BR")} ·{" "}
            {snapshot.source === "meta_instagram_api"
              ? "Conta conectada"
              : "Perfil público"}
          </p>
        ) : (
          <p className="text-sm">Nenhuma coleta salva ainda.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!!busy || !social?.account}
            onClick={() =>
              action("collect", "/api/integrations/instagram/collect")
            }
            className="border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            Atualizar conta conectada
          </button>
          <button
            disabled={!!busy}
            onClick={() =>
              action("scrape", "/api/integrations/instagram/scrape")
            }
            className="border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            Coletar perfil público
          </button>
        </div>
        {(jobs?.jobs || [])
          .filter((j: any) => j.status === "running")
          .map((j: any) => (
            <button
              key={j.id}
              disabled={!!busy}
              onClick={() =>
                action(
                  "poll",
                  `/api/integrations/instagram/scrape?id=${j.id}`,
                  "GET",
                )
              }
              className="text-sm text-primary flex gap-2 items-center"
            >
              <RefreshCw size={14} />
              Verificar coleta de @{j.username}
            </button>
          ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          disabled={!!busy}
          onClick={() => action("strategy", "/api/ai/strategy")}
          className="bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Brain size={16} />
          )}
          Gerar diagnóstico e plano
        </button>
        {reports.length > 0 && (
          <select
            aria-label="Relatório salvo"
            value={saved?.id || ""}
            onChange={(e) => setSelected(e.target.value)}
            className="border rounded-xl px-3 bg-card"
          >
            {reports.map((r: any) => (
              <option key={r.id} value={r.id}>
                {new Date(r.created_at).toLocaleString("pt-BR")}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      {report && (
        <div className="space-y-4">
          <article className="glass-card rounded-xl p-5">
            <h2 className="font-semibold mb-2">Diagnóstico</h2>
            <p className="text-sm whitespace-pre-wrap">{report.diagnosis}</p>
            <h3 className="font-semibold mt-4 mb-2">Posicionamento</h3>
            <p className="text-sm whitespace-pre-wrap">{report.positioning}</p>
          </article>
          <div className="grid md:grid-cols-2 gap-4">
            <article className="glass-card rounded-xl p-5">
              <h3 className="font-semibold mb-2">Evidências</h3>
              <ul className="list-disc pl-5 text-sm space-y-2">
                {report.evidence.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </article>
            <article className="glass-card rounded-xl p-5">
              <h3 className="font-semibold mb-2">O que ainda falta medir</h3>
              <ul className="list-disc pl-5 text-sm space-y-2">
                {report.gaps.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </article>
          </div>
          <h2 className="font-semibold">Plano de ação</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {report.actions.map((a: any, i: number) => (
              <article key={i} className="glass-card rounded-xl p-5 space-y-2">
                <span className="text-xs text-primary">
                  Prioridade {a.priority} · {a.deadline_days} dias
                </span>
                <h3 className="font-semibold">{a.action}</h3>
                <p className="text-sm text-muted-foreground">{a.reason}</p>
                <p className="text-sm">Responsável: {a.owner}</p>
                <p className="text-sm">Medir: {a.metric}</p>
                <p className="text-sm">Meta proposta: {a.target}</p>
              </article>
            ))}
          </div>
          {report.content_plan.length > 0 && (
            <article className="glass-card rounded-xl p-5 overflow-auto">
              <h2 className="font-semibold mb-3">Calendário de conteúdo</h2>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="p-2">Dia</th>
                    <th className="p-2">Formato</th>
                    <th className="p-2">Tema</th>
                    <th className="p-2">Chamada para ação</th>
                  </tr>
                </thead>
                <tbody>
                  {report.content_plan.map((p: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{p.day}</td>
                      <td className="p-2">{p.format}</td>
                      <td className="p-2">{p.topic}</td>
                      <td className="p-2">{p.cta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}
        </div>
      )}
    </div>
  );
}

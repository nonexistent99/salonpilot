"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
export function InstagramSettings() {
  const { data, mutate } = useSWR("/api/integrations/instagram", fetcher, {
    revalidateOnFocus: false,
  });
  const { data: settings, mutate: refreshSettings } = useSWR(
    "/api/ai/settings",
    fetcher,
    { revalidateOnFocus: false },
  );
  const [token, setToken] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [tone, setTone] = useState("Acolhedor e profissional");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (settings && !dirty) {
      setKnowledge(settings.business_knowledge);
      setTone(settings.tone);
    }
  }, [settings, dirty]);
  async function save(url: string, method: string, body: unknown) {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao salvar.");
      if (url === "/api/ai/settings") {
        await refreshSettings(d, { revalidate: false });
        setDirty(false);
      } else {
        setToken("");
        await mutate();
      }
      setNotice("Configuração salva.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <section className="glass-card p-5 rounded-xl space-y-3">
        <h2 className="font-semibold">Instagram Direct</h2>
        <p className="text-sm text-muted-foreground">
          Receba mensagens na caixa de entrada e ative a Bella para responder às
          clientes.
        </p>
        {data?.account ? (
          <div className="space-y-2">
            <p>
              @{data.account.username} ·{" "}
              {data.account.status === "connected"
                ? "Conectado"
                : "Desconectado"}
            </p>
            <label className="text-sm flex gap-2">
              <input
                type="checkbox"
                checked={data.account.ai_enabled}
                disabled={busy || data.account.status !== "connected"}
                onChange={(e) =>
                  save("/api/integrations/instagram", "PATCH", {
                    ai_enabled: e.target.checked,
                  })
                }
              />
              Atendimento automático com IA
            </label>
            {data.account.status === "connected" && (
              <button
                disabled={busy}
                onClick={() =>
                  save("/api/integrations/instagram", "DELETE", {})
                }
                className="border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              >
                Desconectar atendimento
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm">Nenhuma conta conectada.</p>
        )}
        <details>
          <summary className="text-sm cursor-pointer">
            Conectar conta profissional — configuração técnica
          </summary>
          <p className="text-xs text-muted-foreground my-2">
            Use o token do Instagram Login gerado no aplicativo Meta. O
            aplicativo precisa das permissões de mensagens e de um webhook
            configurado.
          </p>
          <input
            aria-label="Token de acesso do Instagram"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token da conta profissional"
            className="w-full border bg-card rounded-lg p-2"
          />
          <button
            disabled={busy || !token.trim()}
            onClick={() =>
              save("/api/integrations/instagram", "POST", {
                access_token: token.trim(),
              })
            }
            className="mt-2 border rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            Verificar e conectar
          </button>
        </details>
      </section>
      <section className="glass-card p-5 rounded-xl space-y-3">
        <h2 className="font-semibold">Conhecimento da Bella</h2>
        <p className="text-sm text-muted-foreground">
          Informações exclusivas desta empresa. Cadastre endereço, políticas,
          formas de pagamento e dúvidas frequentes. Preços e disponibilidade vêm
          dos serviços e da agenda.
        </p>
        <label className="block text-sm">
          Tom de voz
          <input
            value={tone}
            maxLength={300}
            onChange={(e) => {
              setDirty(true);
              setTone(e.target.value);
            }}
            className="block w-full border bg-card rounded-lg p-2 mt-1"
          />
        </label>
        <label className="block text-sm">
          Informações da empresa
          <textarea
            value={knowledge}
            maxLength={12000}
            rows={6}
            onChange={(e) => {
              setDirty(true);
              setKnowledge(e.target.value);
            }}
            className="block w-full border bg-card rounded-lg p-2 mt-1"
          />
        </label>
        <button
          disabled={busy || !dirty}
          onClick={() =>
            save("/api/ai/settings", "PUT", {
              business_knowledge: knowledge,
              tone,
            })
          }
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm disabled:opacity-50"
        >
          Salvar conhecimento
        </button>
      </section>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}

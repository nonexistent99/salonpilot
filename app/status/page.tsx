"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "error";
  database: string;
  message: string;
  recovery?: string;
  responseTime?: string;
  timestamp: string;
  errorType?: string;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err) {
      setHealth({
        status: "error",
        database: "unknown",
        message: "Erro ao chamar endpoint de health check",
        timestamp: new Date().toISOString(),
      });
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Status do Sistema
          </h1>
          <p className="text-muted-foreground">
            Monitoramento da conectividade com o banco de dados
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-6 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Verificando...</span>
            </div>
          ) : health ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {health.status === "healthy" ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <div>
                      <h2 className="text-lg font-semibold text-green-500">
                        Tudo Funcionando
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Conexão com o banco de dados estabelecida
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <div>
                      <h2 className="text-lg font-semibold text-red-500">
                        Problema Detectado
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        O sistema não consegue se conectar ao banco de dados
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Status
                  </p>
                  <p className="font-semibold text-foreground capitalize">
                    {health.status}
                  </p>
                </div>

                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Database
                  </p>
                  <p className="font-semibold text-foreground capitalize">
                    {health.database}
                  </p>
                </div>

                {health.responseTime && (
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Tempo de Resposta
                    </p>
                    <p className="font-semibold text-foreground">
                      {health.responseTime}
                    </p>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="rounded-lg bg-secondary/30 p-4">
                <p className="text-sm text-foreground">{health.message}</p>
              </div>

              {/* Recovery Steps */}
              {health.recovery && (
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
                  <h3 className="text-sm font-semibold text-warning mb-2">
                    Ação Recomendada:
                  </h3>
                  <p className="text-sm text-foreground">{health.recovery}</p>
                </div>
              )}

              {/* Error Type */}
              {health.errorType && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Tipo de Erro
                  </p>
                  <p className="font-mono text-sm text-destructive">
                    {health.errorType}
                  </p>
                </div>
              )}

              {/* Last Checked */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Última verificação:{" "}
                  {lastChecked?.toLocaleTimeString("pt-BR")}
                </p>
                <button
                  onClick={checkHealth}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? "Verificando..." : "Verificar Agora"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Erro ao obter status do sistema
            </p>
          )}
        </div>

        {/* Guide */}
        <div className="mt-8 rounded-lg border border-border bg-card/50 backdrop-blur-sm p-6 md:p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Guia de Recuperação
          </h2>

          {health?.status === "unhealthy" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Se o status for "paused":
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Acesse https://app.supabase.com</li>
                  <li>Localize o projeto</li>
                  <li>Clique em "Resume"</li>
                  <li>Aguarde 2-3 minutos</li>
                  <li>Verifique o status aqui novamente</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Se o problema persistir:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    Veja o arquivo SUPABASE_RECOVERY.md na raiz do projeto
                  </li>
                  <li>Contacte o suporte do Supabase</li>
                  <li>Considere criar uma nova instância</li>
                </ol>
              </div>
            </div>
          )}

          {health?.status === "healthy" && (
            <p className="text-sm text-green-600">
              ✅ O sistema está funcionando normalmente. Nenhuma ação é
              necessária.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

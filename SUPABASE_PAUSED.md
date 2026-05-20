# Instância Supabase Pausada - Guia de Resolução

## Status Atual
- **Projeto**: db.azeukzntqjpmdslgasji.supabase.co
- **Problema**: Instância em pausa/suspensão
- **Erro**: `ENOTFOUND` ao tentar conectar

## Solução Rápida (2 minutos)

### 1. Acessar Dashboard Supabase
```
1. Vá para https://app.supabase.com
2. Faça login com suas credenciais
3. Selecione o projeto "SalesOps Dashboard"
```

### 2. Reativar Instância
```
1. Na página do projeto, procure por um botão ou mensagem sobre "Paused"
2. Clique em "Resume" ou "Reactivate"
3. Aguarde 1-2 minutos para a instância reiniciar
```

### 3. Validar Conexão
```
Após reativar, teste a conexão:
- Acesse: /status (página de health check)
- Execute: node scripts/test-pg-connection.js
- Deve exibir "✓ Conexão estabelecida!"
```

## Por Que Isso Aconteceu?

Supabase pausa automaticamente projetos no plano **Free** após:
- 1 semana de inatividade no projeto
- Ou quando há limite de recursos

## Como Evitar no Futuro

### Opção A: Upgrade para Plano Pro
- Acesse https://app.supabase.com/projects
- Clique no projeto > Settings > Billing
- Upgrade para Pro ($25/mês)
- Nunca mais pausa automática

### Opção B: Manter Projeto Ativo
- Use o projeto regularmente (API calls, dashboard access)
- Configure alertas de pausa
- Reative a cada semana se não usar

### Opção C: Usar Banco de Dados Alternativo
Se o upgrade não for viável, considere:
- **Neon** - Serverless PostgreSQL com free tier melhor
- **Railway** - PostgreSQL gerenciado
- **Vercel KV + Postgres** - Integração nativa

## Credenciais de Acesso

```
URL: https://app.supabase.com
Projeto: azeukzntqjpmdslgasji
Database: postgres
Host: db.azeukzntqjpmdslgasji.supabase.co
```

## Contato Supabase

Se a pausa persistir após reativação:
1. Support email: support@supabase.io
2. Status page: status.supabase.com
3. Documentação: supabase.com/docs

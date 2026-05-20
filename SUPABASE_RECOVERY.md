# Guia de Recuperação - Instância Supabase Pausada

## Status Atual
- **URL**: https://wsdkoikkbtmkaiymyskt.supabase.co
- **Problema**: A instância está pausada/suspensa e não responde a conexões
- **Erro**: `fetch failed` ao tentar conectar

## Causas Possíveis
1. **Pausa por Inatividade**: Supabase pausa projetos gratuitos após 7 dias de inatividade
2. **Suspensão**: Limite de recursos excedido ou violação de política
3. **Problema de Rede**: (menos provável, dada a configuração das env vars estar correta)

## Soluções

### Opção 1: Reativar via Dashboard Supabase (Recomendado)
1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Entre na sua conta
3. Localize o projeto "wsdkoikkbtmkaiymyskt"
4. Se mostrar "Paused" (pausado), clique em "Resume"
5. Aguarde 2-3 minutos para reativação completa
6. Teste a conexão novamente

### Opção 2: Criar Nova Instância Supabase
Se você não conseguir acessar o dashboard:

1. **Criar novo projeto**:
   - Acesse [https://app.supabase.com](https://app.supabase.com)
   - Clique em "New Project"
   - Escolha uma região (recomendamos a mais próxima)
   - Configure o banco de dados

2. **Copiar as variáveis de ambiente**:
   - Vá para Settings > API
   - Copie `SUPABASE_URL` e `SUPABASE_ANON_KEY`
   - Vá para Settings > Database > Connection pooling
   - Copie `POSTGRES_URL`

3. **Atualizar .env.local ou variáveis de projeto**:
   ```
   SUPABASE_URL=<nova_url>
   SUPABASE_ANON_KEY=<nova_key>
   SUPABASE_SERVICE_ROLE_KEY=<nova_key>
   POSTGRES_URL=<nova_url>
   NEXT_PUBLIC_SUPABASE_URL=<nova_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<nova_key>
   ```

4. **Executar as migrações do banco**:
   ```bash
   node scripts/001-initial-schema.js
   node scripts/002-subscriptions.js
   node scripts/003-ai-cache.js
   # ... e assim por diante com todos os scripts numerados
   ```

### Opção 3: Usar Supabase Gratuito (sem risco de pausa)
Upgrade para o plano Pro (R$ 25/mês) que **não pausa projetos**.

## Verificar Quando Estiver Pronto

Execute este comando para testar a conexão:

```bash
node scripts/test-connection.js
```

Você verá ✅ quando a conexão estiver funcionando.

## Dados Importantes

### Histórico de Variáveis de Ambiente
Guarde as variáveis antigas em caso de precisar recuperar dados:

```
URL Antiga: https://wsdkoikkbtmkaiymyskt.supabase.co
```

### Scripts de Migração
Todos os scripts SQL/JavaScript estão em `/scripts/`:
- `001-initial-schema.js` - Schema base
- `002-subscriptions.js` - Sistema de assinaturas
- `003-ai-cache.js` - Cache de IA
- `004-architecture-tables.js` - Tabelas de arquitetura
- `005-yaml-config-tables.js` - Tabelas do config YAML
- `006-admin-tables.js` - Tabelas de admin

## Próximos Passos

1. **Assim que reativar**, execute o test:
   ```bash
   node scripts/test-connection.js
   ```

2. **Se for criar nova instância**, execute todas as migrações na ordem

3. **Atualize as variáveis** no Settings do Vercel ou arquivo .env

4. **Teste o app** - acesse `/api/profile` para confirmar que as queries funcionam

## Suporte

Se o problema persistir:
- Verifique o status do Supabase em [https://status.supabase.com](https://status.supabase.com)
- Contacte suporte do Supabase com a ID do projeto
- Verifique logs em Settings > Logs da aplicação Next.js

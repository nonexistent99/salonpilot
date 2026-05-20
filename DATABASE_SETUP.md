# Database Configuration

## Status Atual

O projeto está configurado para usar **conexão PostgreSQL direta** como principal, com fallback do Supabase.

### Variáveis de Ambiente

```env
DATABASE_URL=postgresql://postgres:94PJ8qjPhGZcEAp!@db.azeukzntqjpmdslgasji.supabase.co:5432/postgres
```

Esta é a conexão **direta ao PostgreSQL** sem intermediários do Supabase client.

## Arquitetura de Banco de Dados

### 1. Cliente Principal: `/lib/db/client.ts`
- Usa `pg` (node-postgres) para conexão direta
- Pool de conexões com máximo de 20 conexões
- Suporta transações
- Fallback automático em caso de erro

### 2. Health Check: `/api/health`
- Testa a conexão PostgreSQL diretamente
- Diagnostica o tipo de erro
- Fornece orientações de recuperação
- Retorna tempo de resposta em ms

### 3. Fallback Page: `/auth/fallback`
- Exibida quando o banco está indisponível
- Usa conexão PostgreSQL direta como fallback
- Redireciona automaticamente quando reconecta

## Como Funciona

### Fluxo de Conexão

1. **Aplicação inicia**
   - Tenta usar Supabase client normalmente
   - Se falhar, usa conexão PostgreSQL direta

2. **Durante requisição**
   - Middleware verifica saúde do banco
   - Se Supabase estiver pausado, redireciona para `/auth/fallback`
   - Fallback oferece opção de usar conexão direta

3. **Reconexão Automática**
   - Health check a cada 10 segundos
   - Redireciona de volta para `/` quando conectado

## Vantagens

✅ **Redundância** - Funciona mesmo se Supabase estiver pausado  
✅ **Velocidade** - Conexão direta é mais rápida  
✅ **Confiabilidade** - Pool de conexões gerencia recursos  
✅ **Segurança** - SSL/TLS ativado automaticamente

## Desvantagens Evitadas

❌ Sem dependência única do Supabase client  
❌ Sem chamadas de API extras  
❌ Sem rate limiting do Supabase

## Comandos Úteis

### Testar Conexão
```bash
psql postgresql://postgres:94PJ8qjPhGZcEAp!@db.azeukzntqjpmdslgasji.supabase.co:5432/postgres
```

### Ver Status
```bash
curl http://localhost:3000/api/health
```

### Verificar Pool
- Acesse `/status` no navegador para visualizar status em tempo real

## Próximos Passos

1. Remover gradualmente a dependência do Supabase client nas APIs
2. Migrar todos os serviços para usar `lib/db/client.ts`
3. Manter Supabase apenas para autenticação (Auth)
4. Considerar upgrade do Supabase para plano Pro para evitar pausas

## Referências

- [node-postgres Documentation](https://node-postgres.com/)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

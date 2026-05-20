#!/bin/bash

# Script de Recuperação Automática - Instância Supabase Pausada
# Este script tenta diagnosticar e recuperar a conexão

echo "🔍 Diagnosticando problema de conexão Supabase..."
echo ""

# Verificar variáveis de ambiente
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ ERRO: SUPABASE_URL não configurada"
    exit 1
fi

echo "✅ Variáveis de ambiente configuradas"
echo "   URL: $SUPABASE_URL"
echo ""

# Testar conexão básica com curl
echo "🔗 Testando conexão HTTP..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY")

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "200" ]; then
    echo "✅ Servidor HTTP respondendo (status: $RESPONSE)"
    echo "   A instância parece estar ATIVA"
    echo ""
    echo "Executando teste de query..."
    node scripts/test-connection.js
elif [ "$RESPONSE" = "000" ]; then
    echo "❌ FALHA NA CONEXÃO - Instância pode estar PAUSADA"
    echo "   Status HTTP: $RESPONSE (timeout/connection refused)"
    echo ""
    echo "⚠️  AÇÃO NECESSÁRIA:"
    echo ""
    echo "1. Acesse: https://app.supabase.com"
    echo "2. Localize o projeto 'wsdkoikkbtmkaiymyskt'"
    echo "3. Clique em 'Resume' se mostrar 'Paused'"
    echo "4. Aguarde 2-3 minutos"
    echo "5. Execute novamente este script"
    echo ""
    exit 1
else
    echo "⚠️  Status HTTP desconhecido: $RESPONSE"
    echo "   Pode ser um problema de rede ou configuração"
fi

echo ""
echo "📋 Para mais informações, veja SUPABASE_RECOVERY.md"

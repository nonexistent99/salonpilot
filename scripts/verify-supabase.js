const fetch = require('node-fetch');

console.log('[v0] Verificando variáveis de ambiente...\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? url.substring(0, 30) + '...' : 'NÃO DEFINIDA');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? anonKey.substring(0, 20) + '...' : 'NÃO DEFINIDA');

if (!url || !anonKey) {
  console.log('\n❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

// Verificar que o URL é do projeto correto
if (url.includes('azeukzntqjpmdslgasji')) {
  console.log('\n✅ URL aponta para o projeto correto (azeukzntqjpmdslgasji)');
} else {
  console.log('\n⚠️  URL não aponta para o projeto esperado!');
}

console.log('\n[v0] Próximos passos:');
console.log('1. Recarregue o navegador (Ctrl+Shift+R)');
console.log('2. Tente criar uma conta novamente');
console.log('3. Se o erro persistir, acesse /debug para mais informações');

import { createClient } from "@supabase/supabase-js";

async function testConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Erro: Variáveis de ambiente não configuradas");
    process.exit(1);
  }

  console.log("[v0] Testando conexão com Supabase...");
  console.log("[v0] URL:", supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Tentar fazer uma query simples
    const { data, error } = await supabase
      .from("profiles")
      .select("count", { count: "exact" })
      .limit(1);

    if (error) {
      console.error("[v0] Erro na query:", error.message);
      console.error("[v0] Código:", error.code);
      
      // Tentar diagnosticar
      if (error.message.includes("suspended") || error.message.includes("paused")) {
        console.error("[v0] PROBLEMA: Instância do Supabase está pausada/suspensa");
        console.log("[v0] Solução: Você precisa acessar o dashboard do Supabase e reativar a instância");
      }
    } else {
      console.log("[v0] ✅ Conexão bem-sucedida!");
      console.log("[v0] Dados:", data);
    }
  } catch (err) {
    console.error("[v0] Erro na conexão:", err.message);
  }
}

testConnection();

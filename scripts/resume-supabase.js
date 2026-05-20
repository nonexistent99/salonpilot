#!/usr/bin/env node

/**
 * Script para reativar instância Supabase pausada
 * Uso: node scripts/resume-supabase.js <access_token> <project_id>
 * 
 * Para obter o access token:
 * 1. Vá em https://supabase.com/dashboard/account/tokens
 * 2. Crie um novo token pessoal
 * 3. Use: node scripts/resume-supabase.js YOUR_TOKEN azeukzntqjpmdslgasji
 */

const https = require("https");

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("❌ Uso: node scripts/resume-supabase.js <access_token> <project_id>");
  console.error("");
  console.error("Para obter seu access token:");
  console.error("1. Vá em https://supabase.com/dashboard/account/tokens");
  console.error("2. Crie um novo token pessoal (Personal Access Token)");
  console.error("3. Execute: node scripts/resume-supabase.js YOUR_TOKEN azeukzntqjpmdslgasji");
  process.exit(1);
}

const [accessToken, projectId] = args;

console.log(`🚀 Reativando projeto Supabase: ${projectId}...`);

const options = {
  hostname: "api.supabase.com",
  port: 443,
  path: `/v1/projects/${projectId}/restart`,
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Content-Length": 0,
  },
};

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log("✅ Instância iniciada com sucesso!");
      console.log("⏳ Aguarde 1-2 minutos para a instância ficar completamente disponível...");
      console.log("");
      console.log("Você pode verificar o status em:");
      console.log(`https://app.supabase.com/project/${projectId}`);
    } else if (res.statusCode === 401) {
      console.error("❌ Erro: Access token inválido");
      console.error("Verifique o token e tente novamente");
    } else if (res.statusCode === 404) {
      console.error("❌ Erro: Projeto não encontrado");
      console.error(`Verifique o ID do projeto: ${projectId}`);
    } else {
      console.error(`❌ Erro (${res.statusCode}):`, data);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Erro ao conectar com Supabase API:", error.message);
});

req.end();

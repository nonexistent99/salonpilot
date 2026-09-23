# SalonPilot: implantação

1. Crie um PostgreSQL na Railway e configure `DATABASE_URL` com a URL pública/TCP para acesso pela Netlify. Use TLS e limite conexões; o pool fica no servidor.
2. Execute as migrações em `db/migrations/` na ordem numérica no novo banco. Para migração de dados existentes, faça exportação/importação do banco antigo e valide integridade antes de trocar `DATABASE_URL`; somente criar tabelas não migra clientes.
3. Vincule o repositório à Netlify; configure `DATABASE_URL`, `OPENAI_API_KEY`, `SUNIZE_API_KEY`, `SUNIZE_API_SECRET` como variáveis secretas de runtime. Configure `OPENAI_MODEL_FAST` e `OPENAI_MODEL_STRATEGIC` se desejar. Nunca use `NEXT_PUBLIC_` para segredos.
4. No painel Sunize v2, registre `https://SEU-DOMINIO/api/billing/webhook` como webhook. Pix Automático requer autorização do cliente. A Sunize exige habilitação específica para cartão recorrente; este checkout usa somente Pix Automático.
5. Rode `npm ci && npm run build`; publique na Netlify. Teste `/api/health`, cadastro/login e compra com ambiente autorizado pela Sunize. Verifique no banco que `billing_subscriptions.status` muda para `ACTIVE` após webhook e `salons.plan` acompanha.

O checkout só cria assinatura, nunca concede acesso diretamente. Webhooks verificam `x-api-secret` e consultam o estado remoto antes de atualizar o salão. Assinaturas anteriores da Stripe não são migradas automaticamente; planeje cancelamento e comunicação ao cliente antes de iniciar cobranças na Sunize.

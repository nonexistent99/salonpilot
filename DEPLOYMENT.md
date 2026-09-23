# SalonPilot: implantação e validação

Esta revisão implementa chat Bella persistente por usuário/empresa, atendimento de texto no WhatsApp e Instagram, coleta de perfil e análise estratégica. Não equivale a uma certificação de prontidão para produção.

## Antes da publicação

1. Reconciliar com o código do deploy atual da Netlify. A publicação observada foi feita por upload, sem commit associado; pode conter correções que não estão em `main`.
2. Fazer backup do PostgreSQL e executar `npm run db:migrate` com a conexão do ambiente correto. A execução é explícita, versionada e transacional por arquivo; não roda durante o build. Bancos existentes com esquemas antigos devem ser comparados antes de executar migrações históricas.
3. Configurar os valores abaixo no servidor. Nunca usar prefixo `NEXT_PUBLIC_` para segredos.
4. Executar `npm ci`, `npm test`, `npm run typecheck` e `npm run build`.
5. Publicar usando o runtime Next.js da Netlify. Não enviar `.next` como site estático. O arquivo `netlify.toml` inclui as funções de fila.
6. Reconectar instâncias WhatsApp existentes para instalar o segredo exclusivo no webhook. A nova versão recusa webhooks sem autenticação. Planejar essa mudança com o deploy para evitar interrupções.
7. Validar com dois salões de teste, contas reais dos provedores e uma conversa autorizada em cada canal, antes de habilitar clientes.

## Configuração necessária

| Chave                                              | Uso                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                     | PostgreSQL existente. Não criar outro banco por padrão.                                                                   |
| `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED` | Opções explícitas do script de migração; ajustar ao certificado da instância.                                             |
| `OPENAI_API_KEY`                                   | IA OpenAI; também pode vir da configuração administrativa criptografada já existente.                                     |
| `OPENAI_MODEL_FAST`, `OPENAI_MODEL_STRATEGIC`      | Preserva os modelos já configurados e seus padrões atuais.                                                                |
| `APP_ENCRYPTION_KEY`                               | Chave estável para criptografia. Preservar a chave existente; trocar sem migração torna tokens ilegíveis.                 |
| `NEXT_PUBLIC_APP_URL`                              | URL HTTPS da publicação, usada para registrar o webhook do WhatsApp.                                                      |
| `EVOLUTION_BASE_URL`, `EVOLUTION_GLOBAL_API_KEY`   | Instância Evolution v2; também pode usar a configuração administrativa existente.                                         |
| `EVOLUTION_ALLOWED_HOSTS`                          | Hosts adicionais explicitamente autorizados para instâncias próprias. Opcional.                                           |
| `INTERNAL_JOB_SECRET` ou `CRON_SECRET`             | Segredo compartilhado do agendador e worker; preservar valor existente.                                                   |
| `META_GRAPH_VERSION`                               | Versão do Graph API validada no aplicativo Meta, por exemplo `v25.0` na documentação consultada.                          |
| `META_APP_SECRET`                                  | Valida a assinatura dos webhooks do Instagram.                                                                            |
| `META_WEBHOOK_VERIFY_TOKEN`                        | Validação inicial da URL do webhook pela Meta.                                                                            |
| `APIFY_API_TOKEN`                                  | Habilita coleta de perfil público pelo ator `apify/instagram-profile-scraper`; depende da conta e cobrança do fornecedor. |

## Instagram

A configuração atual usa token de uma conta profissional via Instagram Login, verificado em `/me`, armazenado criptografado e associado a uma única empresa. A interface permite renovar o token. Login OAuth autônomo e renovação automática ainda não foram implementados.

Configurar a URL `https://<domínio>/api/webhooks/instagram` no aplicativo Meta. São necessárias as permissões `instagram_business_basic` e `instagram_business_manage_messages`, acesso apropriado do aplicativo às contas e assinaturas de eventos. Ao ativar IA, o sistema solicita a assinatura `messages` da conta. A resposta automática respeita a janela de 24 horas e o limite de texto do canal. Áudio e mídia são direcionados a atendimento humano; não há transcrição implementada.

A coleta oficial obtém informações da conta e até 25 publicações. A coleta pública usa apenas o @ cadastrado no perfil do salão, limita a uma conta por execução e registra fonte/data/amostra. Ela é assíncrona: a interface permite consultar a execução e salvar o resultado. Perfis privados, indisponibilidade do fornecedor e permissões insuficientes geram erro explícito. Nenhum número é inventado para preencher lacunas.

Fontes de implementação: [Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started.md/), [mensagens](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api.md/), [coletor público](https://apify.com/apify/instagram-profile-scraper/input-schema), [API Apify](https://docs.apify.com/api/v2/actors-runs-post).

## Entrega e isolamento

- Sessão do servidor define empresa e usuário. O chat não aceita identidade do salão fornecida pelo modelo ou navegador.
- Histórico da consultora separado do atendimento a clientes. Uma chave estrangeira composta protege os turnos contra associação a outra empresa/usuário.
- Cache da aplicação reiniciado por identidade autenticada; mutações de tela usam o cache dessa sessão.
- Webhook e persistência de entrada são transacionais e deduplicados. Evolution usa segredo por conta; Instagram usa HMAC e resolução da conta pelo destinatário.
- Worker processa a fila a cada minuto. Respostas possuem rascunho persistente e chave de idempotência. Entrega incerta pausa a IA e exige conferência humana em vez de repetir automaticamente.
- A interface não garante entrega ao fornecedor: a confirmação real depende da resposta da API. A tabela `channel_outbox` registra `sent` ou `needs_review`.
- Conversas e planos usam dados disponíveis, distinguem hipóteses e não enviam campanhas automaticamente. A Bella consultora não executa alterações no CRM.

## Verificação realizada nesta revisão

Testes com PostgreSQL embarcado descartável (PGlite), usando as migrações SQL e os serviços reais. Apenas o cliente de OpenAI e as chamadas HTTP externas foram substituídos por respostas controladas. A extensão UUID do teste é substituída por uma função equivalente; isso não valida rede, credenciais, permissões Meta, comportamento de uma instância Evolution específica ou concorrência de múltiplos servidores.

Também há verificação TypeScript e build Next.js. Testes de integração com provedores reais, migração do PostgreSQL Railway existente e publicação da Netlify permanecem gates de implantação.

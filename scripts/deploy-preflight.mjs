import { Pool } from "pg";
import { readFile } from "node:fs/promises";
const keys = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "APP_ENCRYPTION_KEY",
  "EVOLUTION_BASE_URL",
  "EVOLUTION_GLOBAL_API_KEY",
  "INTERNAL_JOB_SECRET",
  "CRON_SECRET",
  "META_GRAPH_VERSION",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "APIFY_API_TOKEN",
];
console.log(
  "Deployment configuration (presence only):",
  Object.fromEntries(keys.map((k) => [k, Boolean(process.env[k])])),
);
if (!process.env.DATABASE_URL)
  throw new Error(
    "DATABASE_URL must be available in the Netlify build scope to validate the database before publishing.",
  );
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : {
          rejectUnauthorized:
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
        },
  connectionTimeoutMillis: 10000,
});
try {
  const result = await pool.query(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'",
  );
  const schema = Object.groupBy(result.rows, (r) => r.table_name);
  const required = {
    users: ["id", "active", "full_name", "salon_id"],
    sessions: ["token", "user_id", "expires_at"],
    salons: ["id"],
    whatsapp_accounts: ["id", "webhook_secret_encrypted"],
    conversation_threads: ["instagram_account_id", "instagram_sender_id"],
    owner_ai_threads: ["id"],
    owner_ai_turns: ["id"],
    salon_ai_settings: ["salon_id"],
    instagram_accounts: ["id"],
    instagram_snapshots: ["id"],
    strategy_reports: ["id"],
    channel_outbox: ["id"],
    instagram_scrape_jobs: ["id"],
  };
  const missing = [];
  for (const [table, columns] of Object.entries(required))
    for (const column of columns)
      if (!schema[table]?.some((r) => r.column_name === column))
        missing.push(`${table}.${column}`);
  console.log("Database schema check:", missing.length ? { missing } : "ready");
  if (missing.length)
    throw new Error(
      "Database migration required before production publication.",
    );
} catch (error) {
  console.error(
    "Deployment database check failed:",
    error.code ||
      error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]"),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}

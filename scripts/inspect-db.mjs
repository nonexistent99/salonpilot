import { readFileSync, existsSync } from 'node:fs';
import pkg from 'pg';
const { Client } = pkg;

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv('.env.local');
loadEnv('.env');

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const tablesToInspect = [
  'salons', 'users', 'services', 'professionals', 'customers',
  'appointments', 'campaigns', 'campaign_recipients',
  'ai_recommendations', 'daily_missions', 'content_suggestions',
  'metrics_snapshots', 'zaia_integrations', 'zaia_events',
  'salon_strategy_profile', 'salon_kpi_snapshots', 'salon_intelligence_notes',
  'strategy_experiments', 'growth_kpi_insights', 'business_events',
  'conversations', 'conversation_messages'
];

for (const t of tablesToInspect) {
  try {
    const c = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    const col = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [t]
    );
    const cols = col.rows.map(r => r.column_name).join(', ');
    console.log(`${t}: ${c.rows[0].n} rows | ${cols}`);
  } catch (e) {
    console.log(`${t}: ERROR ${e.message}`);
  }
}

await client.end();

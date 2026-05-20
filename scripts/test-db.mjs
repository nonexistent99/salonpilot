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

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(2); }

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const r = await client.query('SELECT NOW() as now, version() as v');
  console.log('OK', r.rows[0].now, r.rows[0].v.split(',')[0]);
  const t = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  console.log('TABLES', t.rowCount);
  for (const row of t.rows) console.log(' -', row.table_name);
  await client.end();
} catch (e) {
  console.error('FAIL', e.code || '', e.message);
  process.exit(1);
}

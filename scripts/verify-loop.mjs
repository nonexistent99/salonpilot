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

const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const salonId = '11111111-1111-1111-1111-111111111111';

// Last AI-generated campaign for the salon
const lastCamp = await c.query(
  `SELECT id FROM campaigns WHERE salon_id=$1 AND generated_by_ai=true ORDER BY created_at DESC LIMIT 1`,
  [salonId]
);
if (!lastCamp.rows.length) { console.error('Nenhuma campanha IA encontrada.'); process.exit(1); }
const campaignId = lastCamp.rows[0].id;

const linkedExp = await c.query(
  `SELECT (audience_filter_json->>'strategy_experiment_id') AS eid FROM campaigns WHERE id=$1`,
  [campaignId]
);
const expId = linkedExp.rows[0].eid;
console.log('campaign_id =', campaignId, '| experiment_id =', expId);

console.log('====== CAMPAIGN ======');
const camp = await c.query(`SELECT name, status, sent_count, responded_count, booked_count, estimated_revenue, started_at, finished_at FROM campaigns WHERE id=$1`, [campaignId]);
console.log(camp.rows[0]);

console.log('\n====== CAMPAIGN_RECIPIENTS ======');
const recs = await c.query(`SELECT cr.status, COUNT(*) FROM campaign_recipients cr WHERE campaign_id=$1 GROUP BY cr.status`, [campaignId]);
console.table(recs.rows);

console.log('\n====== STRATEGY_EXPERIMENT (closed?) ======');
const exp = await c.query(`SELECT hypothesis, action_taken, channel_used, success_score, ai_learning_summary, next_recommendation, completed_at FROM strategy_experiments WHERE id=$1`, [expId]);
console.log(exp.rows[0]);

console.log('\n====== INTELLIGENCE NOTES (memória atualizada) ======');
const notes = await c.query(`SELECT note_type, title, content, confidence_score, source, created_at FROM salon_intelligence_notes WHERE salon_id=$1 ORDER BY created_at DESC LIMIT 5`, [salonId]);
for (const n of notes.rows) console.log(`[${n.note_type}] ${n.title} (conf ${n.confidence_score}, src ${n.source})\n  ${n.content}\n`);

console.log('\n====== BUSINESS_EVENTS (últimos do loop) ======');
const ev = await c.query(`SELECT event_type, source, event_text, occurred_at FROM business_events WHERE salon_id=$1 ORDER BY occurred_at DESC LIMIT 20`, [salonId]);
for (const e of ev.rows) console.log(`${e.occurred_at.toISOString()} [${e.event_type}] (${e.source || '-'}) ${e.event_text || ''}`);

await c.end();

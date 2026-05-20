/**
 * Prepara o DB para o teste do primeiro loop vivo:
 *   - garante salon_strategy_profile para o salão semente
 *   - força 8 clientes para status='active' com last_visit_at > 35 dias atrás
 *   - garante um aprendizado em salon_intelligence_notes (memória)
 *   - imprime salon_id e algumas amostras
 */
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

const salon = await c.query(`SELECT id, name FROM salons ORDER BY created_at ASC LIMIT 1`);
if (!salon.rows.length) {
  console.error('Sem salão semente. Rode seed primeiro.');
  process.exit(1);
}
const salonId = salon.rows[0].id;
console.log('SALAO_ID:', salonId, '-', salon.rows[0].name);

// 1) strategy profile mínimo
await c.query(
  `INSERT INTO salon_strategy_profile
     (salon_id, business_type, maturity_stage, main_goal, current_main_bottleneck,
      strongest_channel, weakest_channel, strongest_service, most_profitable_service,
      best_customer_segment, average_ticket_level, retention_level, acquisition_level,
      digital_activity_level, sales_process_quality, recommended_positioning,
      communication_tone, strategic_summary)
   VALUES ($1, 'salão_completo', 'em_crescimento', 'aumentar_recorrencia',
           'pos_atendimento_fraco', 'whatsapp', 'instagram',
           'design_de_sobrancelha', 'escova_progressiva',
           'mulheres_25-45_classe_b', 'medio', 'medio', 'baixo',
           'medio', 'manual', 'acolhedor_proximo',
           'acolhedor_feminino_proximo',
           'Salão com boa retenção em serviços de entrada (sobrancelha) mas baixa aquisição. Maior potencial em reativar clientes regulares e aumentar ticket via combos.')
   ON CONFLICT (salon_id) DO UPDATE SET
     updated_at = NOW(),
     current_main_bottleneck = EXCLUDED.current_main_bottleneck,
     strategic_summary = EXCLUDED.strategic_summary`,
  [salonId]
).catch(async err => {
  // Sem UNIQUE constraint? cair no INSERT puro se não existir
  if (err.code === '42P10') {
    const exists = await c.query(`SELECT id FROM salon_strategy_profile WHERE salon_id = $1`, [salonId]);
    if (exists.rows.length === 0) {
      await c.query(
        `INSERT INTO salon_strategy_profile
           (salon_id, business_type, maturity_stage, main_goal, current_main_bottleneck,
            strongest_channel, weakest_channel, strongest_service, most_profitable_service,
            best_customer_segment, average_ticket_level, retention_level, acquisition_level,
            digital_activity_level, sales_process_quality, recommended_positioning,
            communication_tone, strategic_summary)
         VALUES ($1, 'salão_completo', 'em_crescimento', 'aumentar_recorrencia',
                 'pos_atendimento_fraco', 'whatsapp', 'instagram',
                 'design_de_sobrancelha', 'escova_progressiva',
                 'mulheres_25-45_classe_b', 'medio', 'medio', 'baixo',
                 'medio', 'manual', 'acolhedor_proximo',
                 'acolhedor_feminino_proximo',
                 'Salão com boa retenção em serviços de entrada (sobrancelha) mas baixa aquisição. Maior potencial em reativar clientes regulares e aumentar ticket via combos.')`,
        [salonId]
      );
    }
  } else {
    throw err;
  }
});

// 2) plantar 8 clientes sumidas (35d+) com telefone válido
const inactivated = await c.query(
  `WITH picked AS (
     SELECT id FROM customers
      WHERE salon_id = $1 AND phone IS NOT NULL
      ORDER BY total_spent DESC NULLS LAST
      LIMIT 8
   )
   UPDATE customers c
      SET status = 'active',
          last_visit_at = NOW() - INTERVAL '40 days',
          visit_count = GREATEST(c.visit_count, 3),
          total_spent = GREATEST(c.total_spent, 350),
          average_ticket = GREATEST(c.average_ticket, 80),
          updated_at = NOW()
     FROM picked
    WHERE c.id = picked.id
   RETURNING c.id, c.name, c.phone, c.last_visit_at`,
  [salonId]
);
console.log('Plantadas', inactivated.rowCount, 'clientes sumidas:');
for (const r of inactivated.rows) console.log(' -', r.name, r.phone, '— última visita:', r.last_visit_at);

// 3) plantar 1 aprendizado prévio (memória)
await c.query(
  `INSERT INTO salon_intelligence_notes
     (salon_id, note_type, title, content, source, confidence_score)
   VALUES ($1, 'pattern',
           'Campanhas emocionais > desconto neste salão',
           'Em testes anteriores, mensagens calorosas e relacionais converteram 2x mais que ofertas com desconto agressivo. Público responde melhor a "sentir falta" do que a "oferta imperdível".',
           'manual', 0.75)
   ON CONFLICT DO NOTHING`,
  [salonId]
).catch(() => undefined);

console.log('OK. Use SALAO_ID acima para chamar /api/intelligence/detect-inactive.');
await c.end();

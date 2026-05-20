const { Pool } = require('pg');
const fs = require('fs');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Source it from .env.local before running.');
  process.exit(2);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function run() {
  const client = await pool.connect();
  try {
    // 1. Salon
    console.log('Creating salon...');
    await client.query(`
      INSERT INTO salons (id, name, owner_name, phone, email, city, niche, goal, onboarding_completed, plan)
      VALUES ('11111111-1111-1111-1111-111111111111', 'Studio Bella Rosa', 'Ana Paula Ferreira',
        '(11) 99999-8888', 'ana@bellarosa.com.br', 'São Paulo', 'completo', 'mais_clientes', TRUE, 'pro')
      ON CONFLICT (id) DO NOTHING
    `);

    // 2. Admin user
    console.log('Creating admin user...');
    const hash = hashPassword('Admin123!');
    await client.query(`
      INSERT INTO users (id, salon_id, name, email, password_hash, role, is_admin)
      VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
        'Ana Paula Ferreira', 'admin@bellarosa.com', $1, 'owner', FALSE)
      ON CONFLICT (email) DO UPDATE SET salon_id='11111111-1111-1111-1111-111111111111', name='Ana Paula Ferreira', role='owner'
    `, [hash]);

    // 3. Professionals
    console.log('Creating professionals...');
    const profs = [
      ['Camila Rodrigues', 'Cabeleireira', '(11) 91111-2222'],
      ['Jessica Lima', 'Manicure', '(11) 93333-4444'],
      ['Beatriz Santos', 'Esteticista', '(11) 95555-6666'],
    ];
    for (const [name, role, phone] of profs) {
      await client.query(`
        INSERT INTO professionals (salon_id, name, role, phone, active)
        VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, $3, TRUE)
      `, [name, role, phone]);
    }

    // 4. Services
    console.log('Creating services...');
    const services = [
      ['Design de Sobrancelha', 'sobrancelha', 45.00, 45],
      ['Escova Progressiva', 'cabelo', 180.00, 120],
      ['Hidratação Profunda', 'cabelo', 90.00, 60],
      ['Manicure Simples', 'unhas', 35.00, 50],
      ['Pedicure Completa', 'unhas', 50.00, 60],
      ['Alongamento de Unhas', 'unhas', 120.00, 90],
      ['Maquiagem Completa', 'maquiagem', 150.00, 90],
      ['Limpeza de Pele', 'estetica', 110.00, 75],
      ['Lash Lifting', 'sobrancelha', 95.00, 60],
      ['Depilação Buço', 'estetica', 20.00, 15],
    ];
    for (const [name, category, price, duration] of services) {
      await client.query(`
        INSERT INTO services (salon_id, name, category, price, duration_minutes, active)
        VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, $3, $4, TRUE)
      `, [name, category, price, duration]);
    }

    // 5. Tags
    console.log('Creating tags...');
    const tags = [
      ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'VIP', '#C78A6A'],
      ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Aniversariante', '#E8B7C8'],
      ['cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sumida', '#D9534F'],
      ['dddddddd-dddd-dddd-dddd-dddddddddddd', 'Nova Cliente', '#3BAA72'],
      ['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Indicação', '#7C5CFF'],
    ];
    for (const [id, name, color] of tags) {
      await client.query(`
        INSERT INTO customer_tags (id, salon_id, name, color)
        VALUES ($1, '11111111-1111-1111-1111-111111111111', $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [id, name, color]);
    }

    // 6. 50 customers
    console.log('Creating 50 customers...');
    const customers = [
      ['Maria Silva', '(11) 99001-0001', '@mariasilva', 'whatsapp', 'vip', 5, 980.00, 98.00, 10, 0],
      ['Fernanda Costa', '(11) 99001-0002', '@fecosta', 'instagram', 'active', 12, 450.00, 75.00, 6, 1],
      ['Juliana Martins', '(11) 99001-0003', '@jumart', 'whatsapp', 'active', 8, 320.00, 80.00, 4, 0],
      ['Camila Oliveira', '(11) 99001-0004', '@cami_oli', 'referral', 'vip', 3, 1200.00, 120.00, 10, 0],
      ['Patricia Rocha', '(11) 99001-0005', '@patrocha', 'whatsapp', 'active', 20, 280.00, 70.00, 4, 0],
      ['Aline Mendes', '(11) 99001-0006', '@amendes', 'manual', 'inactive', 55, 180.00, 60.00, 3, 1],
      ['Roberta Alves', '(11) 99001-0007', '@roalves', 'whatsapp', 'inactive', 70, 210.00, 70.00, 3, 0],
      ['Sandra Lima', '(11) 99001-0008', '@sandrinha', 'instagram', 'active', 15, 390.00, 65.00, 6, 0],
      ['Carla Ferreira', '(11) 99001-0009', '@carlafer', 'whatsapp', 'vip', 7, 860.00, 86.00, 10, 0],
      ['Beatriz Sousa', '(11) 99001-0010', '@beasousa', 'referral', 'new', 2, 45.00, 45.00, 1, 0],
      ['Larissa Nunes', '(11) 99001-0011', '@lari_n', 'whatsapp', 'active', 25, 260.00, 65.00, 4, 1],
      ['Vanessa Carvalho', '(11) 99001-0012', '@vanessac', 'paid_traffic', 'hot', 1, 90.00, 90.00, 1, 0],
      ['Tatiana Ribeiro', '(11) 99001-0013', '@tati_ri', 'whatsapp', 'inactive', 80, 340.00, 85.00, 4, 0],
      ['Priscila Gomes', '(11) 99001-0014', '@pris_g', 'organic', 'active', 18, 170.00, 55.00, 3, 0],
      ['Renata Campos', '(11) 99001-0015', '@rencamp', 'instagram', 'vip', 4, 720.00, 90.00, 8, 0],
      ['Daniela Moura', '(11) 99001-0016', '@dani_m', 'whatsapp', 'new', 1, 50.00, 50.00, 1, 0],
      ['Isabela Freitas', '(11) 99001-0017', '@isa_f', 'manual', 'inactive', 65, 220.00, 55.00, 4, 2],
      ['Amanda Barbosa', '(11) 99001-0018', '@amanda_b', 'whatsapp', 'active', 10, 400.00, 80.00, 5, 0],
      ['Gabriela Pinto', '(11) 99001-0019', '@gabi_p', 'referral', 'active', 22, 300.00, 75.00, 4, 0],
      ['Monique Santana', '(11) 99001-0020', '@monique_s', 'organic', 'hot', 3, 95.00, 95.00, 1, 0],
      ['Claudia Teixeira', '(11) 99001-0021', '@claudia_t', 'whatsapp', 'vip', 6, 950.00, 95.00, 10, 0],
      ['Marcela Duarte', '(11) 99001-0022', '@marc_d', 'instagram', 'active', 30, 240.00, 60.00, 4, 1],
      ['Simone Araújo', '(11) 99001-0023', '@simone_a', 'whatsapp', 'inactive', 90, 420.00, 70.00, 6, 0],
      ['Natalia Castro', '(11) 99001-0024', '@nati_c', 'referral', 'new', 3, 80.00, 80.00, 1, 0],
      ['Viviane Lopes', '(11) 99001-0025', '@vivi_l', 'whatsapp', 'active', 14, 360.00, 72.00, 5, 0],
      ['Elaine Batista', '(11) 99001-0026', '@ela_b', 'manual', 'inactive', 50, 150.00, 50.00, 3, 0],
      ['Cristiane Souza', '(11) 99001-0027', '@cris_s', 'whatsapp', 'active', 9, 480.00, 96.00, 5, 0],
      ['Flavia Torres', '(11) 99001-0028', '@fla_t', 'instagram', 'vip', 2, 1100.00, 110.00, 10, 0],
      ['Luciana Pereira', '(11) 99001-0029', '@luci_p', 'organic', 'active', 17, 270.00, 67.50, 4, 0],
      ['Kelly Nascimento', '(11) 99001-0030', '@kelly_n', 'whatsapp', 'hot', 1, 120.00, 60.00, 2, 0],
      ['Leticia Fontes', '(11) 99001-0031', '@leti_f', 'referral', 'active', 28, 330.00, 82.50, 4, 0],
      ['Silvia Monteiro', '(11) 99001-0032', '@silvia_m', 'whatsapp', 'inactive', 75, 200.00, 66.67, 3, 1],
      ['Rita Cardoso', '(11) 99001-0033', '@rita_c', 'instagram', 'active', 11, 290.00, 72.50, 4, 0],
      ['Fabiana Braga', '(11) 99001-0034', '@fabi_b', 'paid_traffic', 'new', 5, 70.00, 70.00, 1, 0],
      ['Angela Costa', '(11) 99001-0035', '@angel_c', 'whatsapp', 'vip', 8, 780.00, 86.67, 9, 0],
      ['Michele Azevedo', '(11) 99001-0036', '@miche_a', 'organic', 'active', 23, 310.00, 77.50, 4, 0],
      ['Soraya Medeiros', '(11) 99001-0037', '@sora_m', 'whatsapp', 'cold', 100, 90.00, 45.00, 2, 0],
      ['Tania Vieira', '(11) 99001-0038', '@tania_v', 'manual', 'inactive', 60, 175.00, 58.33, 3, 0],
      ['Miriam Correia', '(11) 99001-0039', '@miriam_c', 'instagram', 'active', 13, 440.00, 88.00, 5, 0],
      ['Vera Dias', '(11) 99001-0040', '@vera_d', 'whatsapp', 'vip', 4, 890.00, 89.00, 10, 0],
      ['Helena Cunha', '(11) 99001-0041', '@hele_c', 'referral', 'new', 2, 45.00, 45.00, 1, 0],
      ['Rosa Fonseca', '(11) 99001-0042', '@rosa_f', 'organic', 'active', 19, 380.00, 76.00, 5, 0],
      ['Irene Melo', '(11) 99001-0043', '@irene_m', 'whatsapp', 'inactive', 85, 260.00, 65.00, 4, 1],
      ['Nadia Faria', '(11) 99001-0044', '@nadia_f', 'instagram', 'hot', 2, 130.00, 65.00, 2, 0],
      ['Celia Ramos', '(11) 99001-0045', '@celia_r', 'manual', 'active', 16, 320.00, 80.00, 4, 0],
      ['Luana Xavier', '(11) 99001-0046', '@luana_x', 'whatsapp', 'vip', 3, 670.00, 83.75, 8, 0],
      ['Adriana Guedes', '(11) 99001-0047', '@adri_g', 'referral', 'active', 26, 250.00, 62.50, 4, 0],
      ['Elisa Andrade', '(11) 99001-0048', '@elisa_a', 'paid_traffic', 'new', 4, 60.00, 60.00, 1, 0],
      ['Ivana Matos', '(11) 99001-0049', '@ivana_m', 'whatsapp', 'inactive', 72, 195.00, 65.00, 3, 0],
      ['Zilda Paixão', '(11) 99001-0050', '@zilda_p', 'organic', 'active', 21, 340.00, 85.00, 4, 0],
    ];
    for (const [name, phone, insta, source, status, daysAgo, total, avg, visits, noShows] of customers) {
      const lastVisit = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      await client.query(`
        INSERT INTO customers (salon_id, name, phone, instagram, source, status, last_visit_at, total_spent, average_ticket, visit_count, no_show_count)
        VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [name, phone, insta, source, status, lastVisit, total, avg, visits, noShows]);
    }

    // 7. Campaigns
    console.log('Creating campaigns...');
    const campaigns = [
      ['Reativação Dezembro', 'reativacao', 'whatsapp', 'finished',
       'Oi, {{nome}}! A gente sentiu sua falta por aqui 💕 Essa semana estamos com uma condição especial para você voltar a se cuidar. Quer que eu te mostre os horários disponíveis?',
       true, 18, 18, 8, 5, 475.00],
      ['Agenda de Sexta', 'agenda_vazia', 'whatsapp', 'active',
       'Oi, {{nome}}! 🌸 Temos horários disponíveis amanhã e seria perfeito para um mimo de beleza! Me chama para agendar.',
       true, 12, 12, 4, 2, 190.00],
      ['Combo Mão & Pé', 'ticket_medio', 'whatsapp', 'draft',
       'Oi, {{nome}}! Você sabia que manicure + pedicure juntos saem mais em conta? Aproveita nossa condição especial de combo essa semana 💅',
       true, 0, 0, 0, 0, 0],
    ];
    for (const [name, objective, channel, status, message, byAI, rCount, sCount, respCount, bookCount, estRev] of campaigns) {
      await client.query(`
        INSERT INTO campaigns (salon_id, name, objective, channel, status, message, generated_by_ai, recipients_count, sent_count, responded_count, booked_count, estimated_revenue)
        VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [name, objective, channel, status, message, byAI, rCount, sCount, respCount, bookCount, estRev]);
    }

    // 8. AI Recommendations
    console.log('Creating AI recommendations...');
    const recs = [
      ['retention', 'Reative 12 clientes sumidas agora',
       'Você tem 12 clientes que não aparecem há mais de 45 dias. Elas já gastaram uma média de R$ 85 por visita.',
       'Clientes recorrentes têm 5x mais chance de comprar do que novas. Reativação tem ROI altíssimo.', 'urgent'],
      ['ticket', 'Venda mais combos para aumentar ticket médio',
       'Seu ticket médio atual é R$ 74. Com 3 combos por semana você alcança R$ 98.',
       'Seu ticket médio está abaixo do potencial. Combos são a forma mais rápida de aumentar a receita sem precisar de mais clientes.', 'high'],
      ['agenda', 'Preencha os horários vagos de sexta',
       'Sexta tem 3 horários livres a partir das 14h. Isso representa R$ 225 em receita que você pode recuperar hoje.',
       'Horários vazios = receita perdida. Uma mensagem rápida para clientes VIP pode resolver.', 'high'],
      ['campaign', 'Crie campanha de aniversariantes desse mês',
       '5 clientes fazem aniversário este mês. Mensagem personalizada gera engajamento e retorno.',
       'Aniversário é o momento emocional perfeito para contato. Taxa de resposta média é 3x maior.', 'medium'],
      ['content', 'Poste um antes e depois hoje no Instagram',
       'Seu perfil não recebe conteúdo há 4 dias. Um antes/depois de um serviço pode atrair novas clientes.',
       'Conteúdo visual de transformação tem engajamento 2x maior do que posts de produto.', 'medium'],
    ];
    for (const [type, title, description, reasoning, priority] of recs) {
      await client.query(`
        INSERT INTO ai_recommendations (salon_id, type, title, description, reasoning, priority, status)
        VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, $3, $4, $5, 'pending')
      `, [type, title, description, reasoning, priority]);
    }

    // 9. Daily missions
    console.log('Creating daily missions...');
    const missions = [
      ['Chamar 5 clientes sumidas', 'Entre em contato com clientes que não aparecem há mais de 45 dias', 50, 'pending', '/clients?filter=inactive'],
      ['Criar campanha de reativação', 'Configure uma campanha automática para clientes inativas', 100, 'pending', '/campaigns/new'],
      ['Postar 1 Story no Instagram', 'Use o gerador de conteúdo para criar um Story atraente', 30, 'completed', '/content'],
      ['Cadastrar 3 clientes atendidas hoje', 'Mantenha seu CRM atualizado com as clientes de hoje', 20, 'pending', '/clients'],
      ['Pedir avaliações do Google', 'Peça para 3 clientes satisfeitas deixarem avaliação no Google', 40, 'pending', null],
    ];
    for (const [title, desc, points, status, url] of missions) {
      await client.query(`
        INSERT INTO daily_missions (salon_id, title, description, points, status, action_url, due_date)
        VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, $3, $4, $5, CURRENT_DATE)
      `, [title, desc, points, status, url]);
    }

    // 10. Historical metrics (30 days)
    console.log('Creating historical metrics...');
    for (let i = 1; i <= 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      await client.query(`
        INSERT INTO metrics_snapshots (salon_id, date, revenue_estimated, new_customers, returning_customers, average_ticket, appointments_count, no_show_count, campaigns_sent, campaign_responses)
        VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (salon_id, date) DO NOTHING
      `, [
        dateStr,
        (Math.random() * 800 + 400).toFixed(2),
        Math.floor(Math.random() * 4 + 1),
        Math.floor(Math.random() * 8 + 3),
        (Math.random() * 40 + 60).toFixed(2),
        Math.floor(Math.random() * 6 + 5),
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 3),
      ]);
    }

    console.log('✅ Seed completo!');
  } catch(e) {
    console.error('Erro no seed:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

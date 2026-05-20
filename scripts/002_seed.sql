-- ============================================================
-- BeautyGrowth OS — Seed de Dados
-- ============================================================

-- Salão exemplo
INSERT INTO salons (id, name, owner_name, phone, email, city, niche, goal, onboarding_completed, plan)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Studio Bella Rosa',
  'Ana Paula Ferreira',
  '(11) 99999-8888',
  'ana@bellarosa.com.br',
  'São Paulo',
  'completo',
  'mais_clientes',
  TRUE,
  'pro'
) ON CONFLICT DO NOTHING;

-- Usuária dona (senha: Admin123!)
-- hash PBKDF2 do Admin123!
INSERT INTO users (id, salon_id, name, email, password_hash, role, is_admin)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Ana Paula Ferreira',
  'admin@bellarosa.com',
  'a1b2c3d4e5f6a7b8:c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0',
  'owner',
  FALSE
) ON CONFLICT DO NOTHING;

-- Profissionais
INSERT INTO professionals (salon_id, name, role, phone, active) VALUES
('11111111-1111-1111-1111-111111111111', 'Camila Rodrigues', 'Cabeleireira', '(11) 91111-2222', TRUE),
('11111111-1111-1111-1111-111111111111', 'Jessica Lima', 'Manicure', '(11) 93333-4444', TRUE),
('11111111-1111-1111-1111-111111111111', 'Beatriz Santos', 'Esteticista', '(11) 95555-6666', TRUE)
ON CONFLICT DO NOTHING;

-- Serviços
INSERT INTO services (salon_id, name, category, price, duration_minutes, active) VALUES
('11111111-1111-1111-1111-111111111111', 'Design de Sobrancelha', 'sobrancelha', 45.00, 45, TRUE),
('11111111-1111-1111-1111-111111111111', 'Escova Progressiva', 'cabelo', 180.00, 120, TRUE),
('11111111-1111-1111-1111-111111111111', 'Hidratação Profunda', 'cabelo', 90.00, 60, TRUE),
('11111111-1111-1111-1111-111111111111', 'Manicure Simples', 'unhas', 35.00, 50, TRUE),
('11111111-1111-1111-1111-111111111111', 'Pedicure Completa', 'unhas', 50.00, 60, TRUE),
('11111111-1111-1111-1111-111111111111', 'Alongamento de Unhas', 'unhas', 120.00, 90, TRUE),
('11111111-1111-1111-1111-111111111111', 'Maquiagem Completa', 'maquiagem', 150.00, 90, TRUE),
('11111111-1111-1111-1111-111111111111', 'Limpeza de Pele', 'estetica', 110.00, 75, TRUE),
('11111111-1111-1111-1111-111111111111', 'Lash Lifting', 'sobrancelha', 95.00, 60, TRUE),
('11111111-1111-1111-1111-111111111111', 'Depilação Buço', 'estetica', 20.00, 15, TRUE)
ON CONFLICT DO NOTHING;

-- Tags
INSERT INTO customer_tags (id, salon_id, name, color) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'VIP', '#C78A6A'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Aniversariante', '#E8B7C8'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Sumida', '#D9534F'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Nova Cliente', '#3BAA72'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Indicação', '#7C5CFF')
ON CONFLICT DO NOTHING;

-- 50 Clientes de exemplo
INSERT INTO customers (salon_id, name, phone, instagram, source, status, last_visit_at, total_spent, average_ticket, visit_count, no_show_count)
SELECT
  '11111111-1111-1111-1111-111111111111',
  nome,
  telefone,
  insta,
  origem,
  status,
  ultima_visita,
  gasto_total,
  ticket_medio,
  visitas,
  faltas
FROM (VALUES
  ('Maria Silva', '(11) 99001-0001', '@mariasilva', 'whatsapp', 'vip', NOW() - INTERVAL '5 days', 980.00, 98.00, 10, 0),
  ('Fernanda Costa', '(11) 99001-0002', '@fecosta', 'instagram', 'active', NOW() - INTERVAL '12 days', 450.00, 75.00, 6, 1),
  ('Juliana Martins', '(11) 99001-0003', '@jumart', 'whatsapp', 'active', NOW() - INTERVAL '8 days', 320.00, 80.00, 4, 0),
  ('Camila Oliveira', '(11) 99001-0004', '@cami_oli', 'referral', 'vip', NOW() - INTERVAL '3 days', 1200.00, 120.00, 10, 0),
  ('Patricia Rocha', '(11) 99001-0005', '@patrocha', 'whatsapp', 'active', NOW() - INTERVAL '20 days', 280.00, 70.00, 4, 0),
  ('Aline Mendes', '(11) 99001-0006', '@amendes', 'manual', 'inactive', NOW() - INTERVAL '55 days', 180.00, 60.00, 3, 1),
  ('Roberta Alves', '(11) 99001-0007', '@roalves', 'whatsapp', 'inactive', NOW() - INTERVAL '70 days', 210.00, 70.00, 3, 0),
  ('Sandra Lima', '(11) 99001-0008', '@sandrinha', 'instagram', 'active', NOW() - INTERVAL '15 days', 390.00, 65.00, 6, 0),
  ('Carla Ferreira', '(11) 99001-0009', '@carlafer', 'whatsapp', 'vip', NOW() - INTERVAL '7 days', 860.00, 86.00, 10, 0),
  ('Beatriz Sousa', '(11) 99001-0010', '@beasousa', 'referral', 'new', NOW() - INTERVAL '2 days', 45.00, 45.00, 1, 0),
  ('Larissa Nunes', '(11) 99001-0011', '@lari_n', 'whatsapp', 'active', NOW() - INTERVAL '25 days', 260.00, 65.00, 4, 1),
  ('Vanessa Carvalho', '(11) 99001-0012', '@vanessac', 'paid_traffic', 'hot', NOW() - INTERVAL '1 days', 90.00, 90.00, 1, 0),
  ('Tatiana Ribeiro', '(11) 99001-0013', '@tati_ri', 'whatsapp', 'inactive', NOW() - INTERVAL '80 days', 340.00, 85.00, 4, 0),
  ('Priscila Gomes', '(11) 99001-0014', '@pris_g', 'organic', 'active', NOW() - INTERVAL '18 days', 170.00, 55.00, 3, 0),
  ('Renata Campos', '(11) 99001-0015', '@rencamp', 'instagram', 'vip', NOW() - INTERVAL '4 days', 720.00, 90.00, 8, 0),
  ('Daniela Moura', '(11) 99001-0016', '@dani_m', 'whatsapp', 'new', NOW() - INTERVAL '1 days', 50.00, 50.00, 1, 0),
  ('Isabela Freitas', '(11) 99001-0017', '@isa_f', 'manual', 'inactive', NOW() - INTERVAL '65 days', 220.00, 55.00, 4, 2),
  ('Amanda Barbosa', '(11) 99001-0018', '@amanda_b', 'whatsapp', 'active', NOW() - INTERVAL '10 days', 400.00, 80.00, 5, 0),
  ('Gabriela Pinto', '(11) 99001-0019', '@gabi_p', 'referral', 'active', NOW() - INTERVAL '22 days', 300.00, 75.00, 4, 0),
  ('Monique Santana', '(11) 99001-0020', '@monique_s', 'organic', 'hot', NOW() - INTERVAL '3 days', 95.00, 95.00, 1, 0),
  ('Claudia Teixeira', '(11) 99001-0021', '@claudia_t', 'whatsapp', 'vip', NOW() - INTERVAL '6 days', 950.00, 95.00, 10, 0),
  ('Marcela Duarte', '(11) 99001-0022', '@marc_d', 'instagram', 'active', NOW() - INTERVAL '30 days', 240.00, 60.00, 4, 1),
  ('Simone Araújo', '(11) 99001-0023', '@simone_a', 'whatsapp', 'inactive', NOW() - INTERVAL '90 days', 420.00, 70.00, 6, 0),
  ('Natalia Castro', '(11) 99001-0024', '@nati_c', 'referral', 'new', NOW() - INTERVAL '3 days', 80.00, 80.00, 1, 0),
  ('Viviane Lopes', '(11) 99001-0025', '@vivi_l', 'whatsapp', 'active', NOW() - INTERVAL '14 days', 360.00, 72.00, 5, 0),
  ('Elaine Batista', '(11) 99001-0026', '@ela_b', 'manual', 'inactive', NOW() - INTERVAL '50 days', 150.00, 50.00, 3, 0),
  ('Cristiane Souza', '(11) 99001-0027', '@cris_s', 'whatsapp', 'active', NOW() - INTERVAL '9 days', 480.00, 96.00, 5, 0),
  ('Flavia Torres', '(11) 99001-0028', '@fla_t', 'instagram', 'vip', NOW() - INTERVAL '2 days', 1100.00, 110.00, 10, 0),
  ('Luciana Pereira', '(11) 99001-0029', '@luci_p', 'organic', 'active', NOW() - INTERVAL '17 days', 270.00, 67.50, 4, 0),
  ('Kelly Nascimento', '(11) 99001-0030', '@kelly_n', 'whatsapp', 'hot', NOW() - INTERVAL '1 days', 120.00, 60.00, 2, 0),
  ('Leticia Fontes', '(11) 99001-0031', '@leti_f', 'referral', 'active', NOW() - INTERVAL '28 days', 330.00, 82.50, 4, 0),
  ('Silvia Monteiro', '(11) 99001-0032', '@silvia_m', 'whatsapp', 'inactive', NOW() - INTERVAL '75 days', 200.00, 66.67, 3, 1),
  ('Rita Cardoso', '(11) 99001-0033', '@rita_c', 'instagram', 'active', NOW() - INTERVAL '11 days', 290.00, 72.50, 4, 0),
  ('Fabiana Braga', '(11) 99001-0034', '@fabi_b', 'paid_traffic', 'new', NOW() - INTERVAL '5 days', 70.00, 70.00, 1, 0),
  ('Angela Costa', '(11) 99001-0035', '@angel_c', 'whatsapp', 'vip', NOW() - INTERVAL '8 days', 780.00, 86.67, 9, 0),
  ('Michele Azevedo', '(11) 99001-0036', '@miche_a', 'organic', 'active', NOW() - INTERVAL '23 days', 310.00, 77.50, 4, 0),
  ('Soraya Medeiros', '(11) 99001-0037', '@sora_m', 'whatsapp', 'cold', NOW() - INTERVAL '100 days', 90.00, 45.00, 2, 0),
  ('Tania Vieira', '(11) 99001-0038', '@tania_v', 'manual', 'inactive', NOW() - INTERVAL '60 days', 175.00, 58.33, 3, 0),
  ('Miriam Correia', '(11) 99001-0039', '@miriam_c', 'instagram', 'active', NOW() - INTERVAL '13 days', 440.00, 88.00, 5, 0),
  ('Vera Dias', '(11) 99001-0040', '@vera_d', 'whatsapp', 'vip', NOW() - INTERVAL '4 days', 890.00, 89.00, 10, 0),
  ('Helena Cunha', '(11) 99001-0041', '@hele_c', 'referral', 'new', NOW() - INTERVAL '2 days', 45.00, 45.00, 1, 0),
  ('Rosa Fonseca', '(11) 99001-0042', '@rosa_f', 'organic', 'active', NOW() - INTERVAL '19 days', 380.00, 76.00, 5, 0),
  ('Irene Melo', '(11) 99001-0043', '@irene_m', 'whatsapp', 'inactive', NOW() - INTERVAL '85 days', 260.00, 65.00, 4, 1),
  ('Nadia Faria', '(11) 99001-0044', '@nadia_f', 'instagram', 'hot', NOW() - INTERVAL '2 days', 130.00, 65.00, 2, 0),
  ('Celia Ramos', '(11) 99001-0045', '@celia_r', 'manual', 'active', NOW() - INTERVAL '16 days', 320.00, 80.00, 4, 0),
  ('Luana Xavier', '(11) 99001-0046', '@luana_x', 'whatsapp', 'vip', NOW() - INTERVAL '3 days', 670.00, 83.75, 8, 0),
  ('Adriana Guedes', '(11) 99001-0047', '@adri_g', 'referral', 'active', NOW() - INTERVAL '26 days', 250.00, 62.50, 4, 0),
  ('Elisa Andrade', '(11) 99001-0048', '@elisa_a', 'paid_traffic', 'new', NOW() - INTERVAL '4 days', 60.00, 60.00, 1, 0),
  ('Ivana Matos', '(11) 99001-0049', '@ivana_m', 'whatsapp', 'inactive', NOW() - INTERVAL '72 days', 195.00, 65.00, 3, 0),
  ('Zilda Paixão', '(11) 99001-0050', '@zilda_p', 'organic', 'active', NOW() - INTERVAL '21 days', 340.00, 85.00, 4, 0)
) AS t(nome, telefone, insta, origem, status, ultima_visita, gasto_total, ticket_medio, visitas, faltas)
ON CONFLICT DO NOTHING;

-- Agendamentos de hoje
INSERT INTO appointments (salon_id, start_time, end_time, status, value)
SELECT
  '11111111-1111-1111-1111-111111111111',
  (CURRENT_DATE + time_start)::TIMESTAMPTZ,
  (CURRENT_DATE + time_end)::TIMESTAMPTZ,
  ap_status,
  ap_value
FROM (VALUES
  ('09:00'::TIME, '10:00'::TIME, 'attended', 90.00),
  ('10:00'::TIME, '11:00'::TIME, 'attended', 45.00),
  ('11:00'::TIME, '12:00'::TIME, 'confirmed', 180.00),
  ('14:00'::TIME, '15:00'::TIME, 'scheduled', 35.00),
  ('15:00'::TIME, '16:00'::TIME, 'scheduled', 120.00),
  ('16:00'::TIME, '17:00'::TIME, 'scheduled', 50.00),
  ('17:00'::TIME, '18:00'::TIME, 'scheduled', 95.00)
) AS t(time_start, time_end, ap_status, ap_value)
ON CONFLICT DO NOTHING;

-- Campanhas
INSERT INTO campaigns (salon_id, name, objective, channel, status, message, generated_by_ai, recipients_count, sent_count, responded_count, booked_count, estimated_revenue)
VALUES
('11111111-1111-1111-1111-111111111111', 'Reativação Dezembro', 'reativacao', 'whatsapp', 'finished',
 'Oi, {{nome}}! A gente sentiu sua falta por aqui 💕 Essa semana estamos com uma condição especial para você voltar a se cuidar. Quer que eu te mostre os horários disponíveis?',
 TRUE, 18, 18, 8, 5, 475.00),

('11111111-1111-1111-1111-111111111111', 'Agenda de Sexta', 'agenda_vazia', 'whatsapp', 'active',
 'Oi, {{nome}}! 🌸 Temos horários disponíveis amanhã e seria perfeito para um mimo de beleza! Me chama para agendar.',
 TRUE, 12, 12, 4, 2, 190.00),

('11111111-1111-1111-1111-111111111111', 'Combo Mão & Pé', 'ticket_medio', 'whatsapp', 'draft',
 'Oi, {{nome}}! Você sabia que manicure + pedicure juntos saem mais em conta? Aproveita nossa condição especial de combo essa semana 💅',
 TRUE, 0, 0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Recomendações IA
INSERT INTO ai_recommendations (salon_id, type, title, description, reasoning, priority, status)
VALUES
('11111111-1111-1111-1111-111111111111', 'retention', 'Reative 12 clientes sumidas agora', 
 'Você tem 12 clientes que não aparecem há mais de 45 dias. Elas já gastaram uma média de R$ 85 por visita.',
 'Clientes recorrentes têm 5x mais chance de comprar do que novas. Reativação tem ROI altíssimo.',
 'urgent', 'pending'),

('11111111-1111-1111-1111-111111111111', 'ticket', 'Venda mais combos para aumentar ticket médio',
 'Seu ticket médio atual é R$ 74. Com 3 combos por semana você alcança R$ 98.',
 'Seu ticket médio está abaixo do potencial. Combos são a forma mais rápida de aumentar a receita sem precisar de mais clientes.',
 'high', 'pending'),

('11111111-1111-1111-1111-111111111111', 'agenda', 'Preencha os horários vagos de sexta',
 'Sexta tem 3 horários livres a partir das 14h. Isso representa R$ 225 em receita que você pode recuperar hoje.',
 'Horários vazios = receita perdida. Uma mensagem rápida para clientes VIP pode resolver.',
 'high', 'pending'),

('11111111-1111-1111-1111-111111111111', 'campaign', 'Crie campanha de aniversariantes desse mês',
 '5 clientes fazem aniversário este mês. Mensagem personalizada gera engajamento e retorno.',
 'Aniversário é o momento emocional perfeito para contato. Taxa de resposta média é 3x maior.',
 'medium', 'pending'),

('11111111-1111-1111-1111-111111111111', 'content', 'Poste um antes e depois hoje no Instagram',
 'Seu perfil não recebe conteúdo há 4 dias. Um antes/depois de um serviço pode atrair novas clientes.',
 'Conteúdo visual de transformação tem engajamento 2x maior do que posts de produto.',
 'medium', 'pending')
ON CONFLICT DO NOTHING;

-- Missões do dia
INSERT INTO daily_missions (salon_id, title, description, points, status, action_url, due_date)
VALUES
('11111111-1111-1111-1111-111111111111', 'Chamar 5 clientes sumidas', 
 'Entre em contato com clientes que não aparecem há mais de 45 dias', 50, 'pending', '/clients?filter=inactive', CURRENT_DATE),

('11111111-1111-1111-1111-111111111111', 'Criar campanha de reativação',
 'Configure uma campanha automática para clientes inativas', 100, 'pending', '/campaigns/new', CURRENT_DATE),

('11111111-1111-1111-1111-111111111111', 'Postar 1 Story no Instagram',
 'Use o gerador de conteúdo para criar um Story atraente', 30, 'completed', '/content', CURRENT_DATE),

('11111111-1111-1111-1111-111111111111', 'Cadastrar 3 clientes atendidas hoje',
 'Mantenha seu CRM atualizado com as clientes de hoje', 20, 'pending', '/clients', CURRENT_DATE),

('11111111-1111-1111-1111-111111111111', 'Pedir avaliações do Google',
 'Peça para 3 clientes satisfeitas deixarem avaliação no Google', 40, 'pending', NULL, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Métricas históricas (30 dias)
INSERT INTO metrics_snapshots (salon_id, date, revenue_estimated, new_customers, returning_customers, average_ticket, appointments_count, no_show_count, campaigns_sent, campaign_responses)
SELECT
  '11111111-1111-1111-1111-111111111111',
  CURRENT_DATE - (s.n || ' days')::INTERVAL,
  (RANDOM() * 800 + 400)::NUMERIC(12,2),
  (RANDOM() * 4 + 1)::INTEGER,
  (RANDOM() * 8 + 3)::INTEGER,
  (RANDOM() * 40 + 60)::NUMERIC(10,2),
  (RANDOM() * 6 + 5)::INTEGER,
  (RANDOM() * 2)::INTEGER,
  (RANDOM() * 2)::INTEGER,
  (RANDOM() * 3)::INTEGER
FROM generate_series(1, 30) AS s(n)
ON CONFLICT DO NOTHING;

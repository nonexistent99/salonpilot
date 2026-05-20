-- ============================================================
-- BeautyGrowth OS — Schema Completo
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SESSÕES (auth via cookie)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================================
-- SALÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  niche TEXT, -- cabelo, unha, estetica, sobrancelha, maquiagem, clinica, completo
  goal TEXT,  -- mais_clientes, reter_clientes, ticket_medio, organizar, lotar_agenda, instagram
  onboarding_completed BOOLEAN DEFAULT FALSE,
  plan TEXT DEFAULT 'free', -- free, starter, pro, elite
  plan_expires_at TIMESTAMPTZ,
  instagram TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'owner', -- owner, manager, staff, admin
  is_admin BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_salon_id ON users(salon_id);

-- ============================================================
-- SERVIÇOS
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- cabelo, unhas, estetica, sobrancelha, maquiagem, outros
  price NUMERIC(10,2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_salon_id ON services(salon_id);

-- ============================================================
-- PROFISSIONAIS
-- ============================================================
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT, -- cabeleireira, manicure, esteticista, recepcionista, etc.
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professionals_salon_id ON professionals(salon_id);

-- ============================================================
-- CLIENTES (CRM)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  email TEXT,
  birth_date DATE,
  source TEXT DEFAULT 'manual', -- whatsapp, instagram, manual, referral, paid_traffic, organic
  status TEXT DEFAULT 'new',    -- new, active, vip, inactive, lost, hot, cold, scheduled, at_risk
  last_visit_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  total_spent NUMERIC(12,2) DEFAULT 0,
  average_ticket NUMERIC(10,2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  return_probability NUMERIC(5,2) DEFAULT 0, -- 0-100
  notes TEXT,
  zaia_contact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_salon_id ON customers(salon_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(salon_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(salon_id, phone);

-- ============================================================
-- TAGS DE CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#C78A6A'
);

CREATE TABLE IF NOT EXISTS customer_tag_relations (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);

-- ============================================================
-- AGENDAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, attended, no_show, canceled
  value NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_salon_id ON appointments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(salon_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);

-- ============================================================
-- CAMPANHAS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT, -- reativacao, agenda_vazia, ticket_medio, primeira_visita, aniversario, pos_atendimento, indicacao, servico_parado
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, instagram, manual
  status TEXT DEFAULT 'draft',     -- draft, scheduled, active, finished, canceled
  audience_filter_json JSONB DEFAULT '{}',
  offer_type TEXT,                 -- desconto, combo, brinde, condicao, relacionamento
  offer_description TEXT,
  message TEXT,
  generated_by_ai BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  responded_count INTEGER DEFAULT 0,
  booked_count INTEGER DEFAULT 0,
  estimated_revenue NUMERIC(10,2) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_salon_id ON campaigns(salon_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(salon_id, status);

-- ============================================================
-- DESTINATÁRIOS DE CAMPANHAS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, responded, booked, failed, opted_out
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);

-- ============================================================
-- CONVERSAS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, instagram, widget, api
  zaia_conversation_id TEXT,
  status TEXT DEFAULT 'open', -- open, closed, waiting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT DEFAULT 'inbound', -- inbound, outbound
  content TEXT,
  message_type TEXT DEFAULT 'text', -- text, image, audio
  source TEXT DEFAULT 'zaia',       -- zaia, user, system
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_salon_id ON conversations(salon_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);

-- ============================================================
-- RECOMENDAÇÕES IA
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  type TEXT, -- campaign, client_action, content, pricing, retention, ticket, agenda
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  action_json JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'pending',  -- pending, accepted, rejected, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_salon_id ON ai_recommendations(salon_id, status);

-- ============================================================
-- MISSÕES DIÁRIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending', -- pending, completed, skipped
  action_url TEXT,
  due_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_missions_salon_id ON daily_missions(salon_id, due_date);

-- ============================================================
-- SUGESTÕES DE CONTEÚDO
-- ============================================================
CREATE TABLE IF NOT EXISTS content_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  type TEXT, -- story, post, reel, caption, offer
  title TEXT,
  content TEXT,
  objective TEXT,
  status TEXT DEFAULT 'draft', -- draft, approved, sent, used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SNAPSHOTS DE MÉTRICAS
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  revenue_estimated NUMERIC(12,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  average_ticket NUMERIC(10,2) DEFAULT 0,
  appointments_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  campaigns_sent INTEGER DEFAULT 0,
  campaign_responses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, date)
);

-- ============================================================
-- INTEGRAÇÕES ZAIA
-- ============================================================
CREATE TABLE IF NOT EXISTS zaia_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL UNIQUE REFERENCES salons(id) ON DELETE CASCADE,
  api_key_encrypted TEXT,
  agent_id TEXT,
  webhook_secret TEXT,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  instagram_enabled BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'inactive', -- inactive, active, error
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zaia_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  event_type TEXT,
  payload_json JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONSENTIMENTOS DE MENSAGENS
-- ============================================================
CREATE TABLE IF NOT EXISTS message_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT,
  consent_status TEXT DEFAULT 'unknown', -- opted_in, opted_out, unknown
  consent_source TEXT,
  consent_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, channel)
);

-- ============================================================
-- USO DE IA
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  provider TEXT,
  model TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  cost_estimated NUMERIC(10,6) DEFAULT 0,
  feature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

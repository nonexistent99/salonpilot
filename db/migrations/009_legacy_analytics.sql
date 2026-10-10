-- Legacy analytics and integration tables required by a fresh installation.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zaia_contact_id TEXT;

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, instagram, widget, api
  zaia_conversation_id TEXT,
  status TEXT DEFAULT 'open', -- open, closed, waiting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  provider TEXT,
  model TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  cost_estimated NUMERIC(10,6) DEFAULT 0,
  feature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

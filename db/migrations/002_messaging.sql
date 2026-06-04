-- WhatsApp, inbox and message persistence.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'evolution',
  evolution_base_url TEXT,
  instance_name TEXT NOT NULL,
  instance_token_encrypted TEXT,
  api_key_encrypted TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'created',
  last_connection_state TEXT,
  last_qr_code TEXT,
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, instance_name)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_salon
  ON whatsapp_accounts(salon_id, status);

CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'whatsapp',
  external_thread_id TEXT,
  remote_jid TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  ai_enabled BOOLEAN DEFAULT TRUE,
  lead_stage TEXT DEFAULT 'new',
  service_in_focus_id UUID REFERENCES services(id) ON DELETE SET NULL,
  appointment_id UUID,
  summary TEXT,
  summary_json JSONB DEFAULT '{}',
  outcome TEXT,
  previous_response_id TEXT,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_salon_status
  ON conversation_threads(salon_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_customer
  ON conversation_threads(customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_threads_account_remote_open
  ON conversation_threads(whatsapp_account_id, remote_jid)
  WHERE channel = 'whatsapp' AND status IN ('active', 'waiting_client', 'human_handoff');

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT DEFAULT 'client',
  channel TEXT DEFAULT 'whatsapp',
  provider TEXT DEFAULT 'evolution',
  provider_message_id TEXT,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  ai_processed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_unprocessed
  ON messages(thread_id, ai_processed, created_at)
  WHERE direction = 'inbound';

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_provider_unique
  ON messages(whatsapp_account_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  provider TEXT DEFAULT 'evolution',
  event_id TEXT,
  event_hash TEXT NOT NULL,
  event_type TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_hash)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_events_account_created
  ON whatsapp_events(whatsapp_account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'pending',
  provider_message_id TEXT,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_pending
  ON whatsapp_outbox(status, scheduled_for);

CREATE TABLE IF NOT EXISTS message_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'scheduled',
  scheduled_for TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_batches_due
  ON message_batches(status, scheduled_for);

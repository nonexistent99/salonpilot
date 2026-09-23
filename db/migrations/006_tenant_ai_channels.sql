-- Additive migration. Run once through scripts/migrate.mjs before deploying.
CREATE TABLE IF NOT EXISTS owner_ai_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(id, salon_id, user_id)
);
CREATE INDEX IF NOT EXISTS owner_ai_threads_owner ON owner_ai_threads(salon_id, user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS owner_ai_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL,
  salon_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(thread_id, salon_id, user_id) REFERENCES owner_ai_threads(id, salon_id, user_id) ON DELETE CASCADE,
  UNIQUE(thread_id, request_id)
);
CREATE TABLE IF NOT EXISTS salon_ai_settings (
  salon_id UUID PRIMARY KEY REFERENCES salons(id) ON DELETE CASCADE,
  business_knowledge TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'Acolhedor e profissional',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL UNIQUE REFERENCES salons(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(id, salon_id)
);
CREATE TABLE IF NOT EXISTS instagram_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  source TEXT NOT NULL,
  profile JSONB NOT NULL,
  posts JSONB NOT NULL DEFAULT '[]',
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS instagram_snapshots_salon ON instagram_snapshots(salon_id, collected_at DESC);
CREATE TABLE IF NOT EXISTS strategy_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report JSONB NOT NULL,
  evidence JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS webhook_secret_encrypted TEXT;
ALTER TABLE conversation_threads ADD COLUMN IF NOT EXISTS instagram_account_id UUID REFERENCES instagram_accounts(id);
ALTER TABLE conversation_threads ADD COLUMN IF NOT EXISTS instagram_sender_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS instagram_thread_open ON conversation_threads(instagram_account_id, instagram_sender_id)
  WHERE channel = 'instagram' AND status IN ('active','waiting_client','human_handoff');
CREATE TABLE IF NOT EXISTS channel_events (
  account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(account_id, event_id)
);
-- Serialize debounce creation and allow only one scheduled batch per thread.
WITH ranked AS (
 SELECT id, row_number() OVER (PARTITION BY salon_id,thread_id ORDER BY scheduled_for DESC,id) AS rn
 FROM message_batches WHERE status='scheduled'
)
UPDATE message_batches SET status='superseded' WHERE id IN (SELECT id FROM ranked WHERE rn>1);
CREATE UNIQUE INDEX IF NOT EXISTS message_batches_scheduled_thread ON message_batches(salon_id,thread_id) WHERE status='scheduled';
CREATE TABLE IF NOT EXISTS instagram_contacts (
 account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
 sender_id TEXT NOT NULL,
 customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 PRIMARY KEY(account_id,sender_id)
);
CREATE TABLE IF NOT EXISTS ai_reply_drafts (
 id TEXT PRIMARY KEY,
 salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
 thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
 content TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS channel_outbox (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
 thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
 idempotency_key TEXT NOT NULL UNIQUE,
 content TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 provider_message_id TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS instagram_scrape_jobs (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 username TEXT NOT NULL,
 provider_run_id TEXT,
 status TEXT NOT NULL DEFAULT 'starting',
 snapshot_id UUID REFERENCES instagram_snapshots(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

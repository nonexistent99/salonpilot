-- Instagram content, CRM memories, lead events, follow-ups and campaign approval.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS instagram_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  objective TEXT,
  title TEXT,
  content TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  visual_brief TEXT,
  cta TEXT,
  tip TEXT,
  status TEXT DEFAULT 'draft',
  created_by_ai_run_id UUID REFERENCES ai_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_contents_salon_status
  ON instagram_contents(salon_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS client_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence NUMERIC(4,3) DEFAULT 0.5,
  source_thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_memories_customer
  ON client_memories(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_customer
  ON lead_events(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  message_suggestion TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_due
  ON follow_up_tasks(salon_id, status, due_at);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS message_template TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_filter_json JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by_ai_run_id UUID REFERENCES ai_runs(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE campaigns
SET message_template = COALESCE(message_template, message)
WHERE message_template IS NULL;

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS booked_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

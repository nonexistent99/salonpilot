-- SalonPilot core CRM and scheduling tables.
-- This project already uses customers as the client table; keep it as the source of truth.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  niche TEXT,
  goal TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  plan TEXT DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  instagram TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  name TEXT,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'owner',
  is_admin BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  email TEXT,
  birth_date DATE,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'new',
  last_visit_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  total_spent NUMERIC(12,2) DEFAULT 0,
  average_ticket NUMERIC(10,2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  return_probability NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  value NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'draft',
  audience_filter_json JSONB DEFAULT '{}',
  offer_type TEXT,
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

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  error_message TEXT
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'new';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_stage TEXT DEFAULT 'new';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_interest_service_id UUID REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_appointment_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE customers SET lifecycle_status = COALESCE(lifecycle_status, status, 'new');
UPDATE customers SET lead_stage = COALESCE(lead_stage, status, 'new');
UPDATE customers SET whatsapp_phone = phone WHERE whatsapp_phone IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_whatsapp_phone ON customers(salon_id, whatsapp_phone);
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle ON customers(salon_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_customers_lead_stage ON customers(salon_id, lead_stage);

ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS rules_json JSONB DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS professional_services (
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (professional_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_services_service_id
  ON professional_services(service_id);

CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_working_hours_salon_weekday
  ON working_hours(salon_id, weekday, active);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_salon_range
  ON schedule_blocks(salon_id, start_time, end_time);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source_thread_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by_ai_run_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE appointments a
SET end_time = a.start_time + make_interval(mins => COALESCE(s.duration_minutes, 60))
FROM services s
WHERE a.service_id = s.id AND a.end_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_professional_range
  ON appointments(salon_id, professional_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_appointments_thread
  ON appointments(source_thread_id);

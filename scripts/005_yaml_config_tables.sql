-- Step 3: Credits system
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  action TEXT,
  description TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure ai_usage_log exists with proper columns
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Lead analysis table (Layer 2 premium analysis)
CREATE TABLE IF NOT EXISTS lead_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  opportunity_score INTEGER,
  marketing_weakness TEXT,
  cold_call_script TEXT,
  offer_strategy TEXT,
  best_contact_time TEXT,
  raw_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Step 8: Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 9: Onboarding column on profiles
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add opening_hours and photos to leads for Google Places data
DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS opening_hours JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS photos JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add rating and photo to meetings for agenda display
DO $$ BEGIN
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS company_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS phone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS photo_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS script TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credits_agency ON credits(agency_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_agency ON credit_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_agency ON ai_usage_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_lead_analysis_lead ON lead_analysis(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_analysis_agency ON lead_analysis(agency_id);
CREATE INDEX IF NOT EXISTS idx_notifications_agency_unread ON notifications(agency_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- RLS policies
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Initialize credits for existing agencies that don't have them
INSERT INTO credits (agency_id, balance, lifetime_purchased)
SELECT id, 50, 50 FROM agencies
WHERE id NOT IN (SELECT agency_id FROM credits)
ON CONFLICT DO NOTHING;

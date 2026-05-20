process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const statements = [
  // Credits table
  `CREATE TABLE IF NOT EXISTS credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_purchased INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(agency_id)
  )`,

  // Credit transactions table
  `CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
    action TEXT,
    description TEXT,
    stripe_session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // AI usage log
  `CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    lead_id UUID,
    action TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    credits_consumed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Lead analysis (Layer 2)
  `CREATE TABLE IF NOT EXISTS lead_analysis (
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
  )`,

  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Profile: onboarding_completed
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false`,

  // Leads: extra google places columns
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS opening_hours JSONB`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS photos JSONB`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_maps_url TEXT`,

  // Meetings: enriched columns
  `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS company_name TEXT`,
  `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1)`,
  `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS photo_url TEXT`,
  `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS script TEXT`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_credits_agency ON credits(agency_id)`,
  `CREATE INDEX IF NOT EXISTS idx_credit_transactions_agency ON credit_transactions(agency_id)`,
  `CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_usage_log_agency ON ai_usage_log(agency_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lead_analysis_lead ON lead_analysis(lead_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lead_analysis_agency ON lead_analysis(agency_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_agency_unread ON notifications(agency_id, is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`,

  // RLS
  `ALTER TABLE credits ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE lead_analysis ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,

  // Initialize credits for existing agencies
  `INSERT INTO credits (agency_id, balance, lifetime_purchased)
   SELECT id, 50, 50 FROM agencies
   WHERE id NOT IN (SELECT agency_id FROM credits)
   ON CONFLICT DO NOTHING`,
];

let success = 0;
let skipped = 0;

for (const stmt of statements) {
  try {
    await client.query(stmt);
    success++;
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
      skipped++;
      success++;
    } else {
      console.log("Error:", e.message?.substring(0, 120));
      skipped++;
    }
  }
}

await client.end();
console.log(`Migration done: ${success} ok, ${skipped} skipped`);

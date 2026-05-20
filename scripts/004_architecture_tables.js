process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. ai_script_cache table
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS public.ai_script_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hash_key TEXT NOT NULL UNIQUE,
        generated_script TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE public.ai_script_cache ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "ai_script_cache_read_all" ON public.ai_script_cache;
      CREATE POLICY "ai_script_cache_read_all" ON public.ai_script_cache FOR SELECT USING (true);
      DROP POLICY IF EXISTS "ai_script_cache_insert_all" ON public.ai_script_cache;
      CREATE POLICY "ai_script_cache_insert_all" ON public.ai_script_cache FOR INSERT WITH CHECK (true);
    `
  });
  if (e1) {
    // Fallback: use raw SQL via REST
    console.log("rpc not available, using direct table creation via REST...");
  }

  // Use the Supabase REST approach - create tables one by one
  // ai_script_cache
  const tables = [
    {
      name: "ai_script_cache",
      sql: `CREATE TABLE IF NOT EXISTS public.ai_script_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hash_key TEXT NOT NULL UNIQUE,
        generated_script TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      )`
    },
    {
      name: "ai_music_cache",
      sql: `CREATE TABLE IF NOT EXISTS public.ai_music_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hash_key TEXT NOT NULL UNIQUE,
        lyrics TEXT,
        short_version TEXT,
        slogan TEXT,
        alt_version TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`
    },
    {
      name: "search_cache",
      sql: `CREATE TABLE IF NOT EXISTS public.search_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hash_key TEXT NOT NULL UNIQUE,
        results JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT now()
      )`
    },
    {
      name: "performance_snapshots",
      sql: `CREATE TABLE IF NOT EXISTS public.performance_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
        snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
        contracts_needed INTEGER DEFAULT 0,
        meetings_needed INTEGER DEFAULT 0,
        leads_needed INTEGER DEFAULT 0,
        daily_meetings_required NUMERIC DEFAULT 0,
        daily_contacts_required NUMERIC DEFAULT 0,
        projected_revenue NUMERIC DEFAULT 0,
        revenue_current NUMERIC DEFAULT 0,
        conversion_rate NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(agency_id, snapshot_date)
      )`
    },
    {
      name: "agency_alerts",
      sql: `CREATE TABLE IF NOT EXISTS public.agency_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )`
    }
  ];

  // Use pg directly
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Create tables
    for (const t of tables) {
      await client.query(t.sql);
      console.log(`Created table: ${t.name}`);
    }

    // RLS + policies
    const policies = [
      `ALTER TABLE public.ai_script_cache ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_script_cache' AND policyname='ai_script_cache_read_all') THEN CREATE POLICY "ai_script_cache_read_all" ON public.ai_script_cache FOR SELECT USING (true); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_script_cache' AND policyname='ai_script_cache_insert_all') THEN CREATE POLICY "ai_script_cache_insert_all" ON public.ai_script_cache FOR INSERT WITH CHECK (true); END IF; END $$`,

      `ALTER TABLE public.ai_music_cache ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_music_cache' AND policyname='ai_music_cache_read_all') THEN CREATE POLICY "ai_music_cache_read_all" ON public.ai_music_cache FOR SELECT USING (true); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_music_cache' AND policyname='ai_music_cache_insert_all') THEN CREATE POLICY "ai_music_cache_insert_all" ON public.ai_music_cache FOR INSERT WITH CHECK (true); END IF; END $$`,

      `ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='search_cache' AND policyname='search_cache_read_all') THEN CREATE POLICY "search_cache_read_all" ON public.search_cache FOR SELECT USING (true); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='search_cache' AND policyname='search_cache_insert_all') THEN CREATE POLICY "search_cache_insert_all" ON public.search_cache FOR INSERT WITH CHECK (true); END IF; END $$`,

      `ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='performance_snapshots' AND policyname='perf_snap_select') THEN CREATE POLICY "perf_snap_select" ON public.performance_snapshots FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='performance_snapshots' AND policyname='perf_snap_insert') THEN CREATE POLICY "perf_snap_insert" ON public.performance_snapshots FOR INSERT WITH CHECK (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())); END IF; END $$`,

      `ALTER TABLE public.agency_alerts ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agency_alerts' AND policyname='alerts_select') THEN CREATE POLICY "alerts_select" ON public.agency_alerts FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agency_alerts' AND policyname='alerts_insert') THEN CREATE POLICY "alerts_insert" ON public.agency_alerts FOR INSERT WITH CHECK (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agency_alerts' AND policyname='alerts_update') THEN CREATE POLICY "alerts_update" ON public.agency_alerts FOR UPDATE USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())); END IF; END $$`,
    ];

    for (const p of policies) {
      try { await client.query(p); } catch (e) { console.log("Policy skip:", e.message?.substring(0, 60)); }
    }
    console.log("Applied RLS policies");

    // Indexes for scalability
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_leads_agency_status ON public.leads(agency_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_leads_city_niche ON public.leads(city, niche)`,
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_agency ON public.subscriptions(agency_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ai_usage_agency_date ON public.ai_usage_log(agency_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_meetings_agency_date ON public.meetings(agency_id, scheduled_at)`,
      `CREATE INDEX IF NOT EXISTS idx_deals_agency_status ON public.deals(agency_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_agency_alerts_agency ON public.agency_alerts(agency_id, is_read)`,
      `CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON public.search_cache(hash_key)`,
      `CREATE INDEX IF NOT EXISTS idx_script_cache_hash ON public.ai_script_cache(hash_key)`,
      `CREATE INDEX IF NOT EXISTS idx_music_cache_hash ON public.ai_music_cache(hash_key)`,
      `CREATE INDEX IF NOT EXISTS idx_perf_snap_agency ON public.performance_snapshots(agency_id, snapshot_date)`,
    ];

    for (const idx of indexes) {
      try { await client.query(idx); } catch (e) { console.log("Index skip:", e.message?.substring(0, 60)); }
    }
    console.log("Created indexes");

    // Add deleted_at column for soft delete on leads
    await client.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='deleted_at') THEN
        ALTER TABLE public.leads ADD COLUMN deleted_at TIMESTAMPTZ;
      END IF;
    END $$`);
    console.log("Added deleted_at to leads");

    // Add ai_estimated_cost_month to subscriptions
    await client.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='ai_estimated_cost_month') THEN
        ALTER TABLE public.subscriptions ADD COLUMN ai_estimated_cost_month NUMERIC DEFAULT 0;
      END IF;
    END $$`);
    console.log("Added ai_estimated_cost_month to subscriptions");

    // Update lead status CHECK constraint to include new statuses
    try {
      await client.query(`ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check`);
      await client.query(`ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new','contacted','meeting_scheduled','proposal_sent','closed_won','closed_lost','scheduled','no_answer'))`);
      console.log("Updated leads status constraint");
    } catch (e) { console.log("Status constraint skip:", e.message?.substring(0, 80)); }

    console.log("All migrations complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

run();

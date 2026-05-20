process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN
      ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    END IF;
  END $$`,

  `CREATE TABLE IF NOT EXISTS public.search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID,
    query_city TEXT,
    query_niche TEXT,
    results_count INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  `ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "search_logs_select_admin" ON public.search_logs`,
  `CREATE POLICY "search_logs_select_admin" ON public.search_logs FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "search_logs_insert" ON public.search_logs`,
  `CREATE POLICY "search_logs_insert" ON public.search_logs FOR INSERT WITH CHECK (true)`,

  `CREATE INDEX IF NOT EXISTS idx_search_logs_agency ON public.search_logs(agency_id)`,
  `CREATE INDEX IF NOT EXISTS idx_search_logs_created ON public.search_logs(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role)`,

  `UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1)`,
];

async function run() {
  await client.connect();
  console.log("Connected.");
  for (let i = 0; i < statements.length; i++) {
    try {
      await client.query(statements[i]);
      console.log("[" + (i + 1) + "/" + statements.length + "] OK");
    } catch (e) {
      console.log("[" + (i + 1) + "/" + statements.length + "] WARN: " + e.message);
    }
  }
  await client.end();
  console.log("Done.");
}

run().catch(console.error);

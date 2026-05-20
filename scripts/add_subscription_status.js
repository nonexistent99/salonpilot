process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import pg from "pg";
const { Client } = pg;
const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const client = new Client({ connectionString: connStr });
await client.connect();

// Add status column to subscriptions (default 'active' for free plan users)
await client.query(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='status') THEN
      ALTER TABLE public.subscriptions ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
  END $$;
`);

// Set all existing subscriptions to 'active'
await client.query(`UPDATE public.subscriptions SET status = 'active' WHERE status IS NULL;`);

console.log("Added status column to subscriptions and set existing rows to 'active'.");

await client.end();

const { Pool } = require('pg');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Source it from .env.local before running.');
  process.exit(2);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  // Check existing tables
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('Tables:', tables.rows.map(r => r.tablename).join(', '));
  
  // Check users table columns
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
  console.log('Users cols:', cols.rows.map(r => r.column_name).join(', '));
  
  await pool.end();
}
run().catch(async e => { console.error(e.message); await pool.end(); });

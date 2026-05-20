const { Pool } = require('pg');
const fs = require('fs');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Source it from .env.local before running.');
  process.exit(2);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Adapt users table to salon structure
    console.log('Adaptando tabela users...');
    
    // Add missing columns to users
    const alterStmts = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id) ON DELETE SET NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
      // Copy full_name to name
      "UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL",
    ];
    
    for (const stmt of alterStmts) {
      try {
        await client.query(stmt);
        console.log('OK:', stmt.substring(0, 60));
      } catch(e) {
        console.log('Skip:', e.message.substring(0, 80));
      }
    }
    
    await client.query('COMMIT');
    console.log('Migração users concluída!');
    
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('Erro:', e.message);
  } finally {
    client.release();
  }
  
  await pool.end();
}
run().catch(async e => { console.error(e.message); await pool.end(); });

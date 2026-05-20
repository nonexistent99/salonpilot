import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read DATABASE_URL from .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error('DATABASE_URL not found'); process.exit(1); }

const pool = new pg.Pool({ connectionString: match[1] });

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding columns...');
    
    await client.query(`ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS main_niche TEXT DEFAULT ''`);
    console.log('✅ agencies.main_niche added');
    
    await client.query(`ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS main_city TEXT DEFAULT ''`);
    console.log('✅ agencies.main_city added');
    
    // Check if onboarding_completed exists on profiles
    const res = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
    `);
    if (res.rows.length === 0) {
      await client.query(`ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false`);
      console.log('✅ profiles.onboarding_completed added');
    } else {
      console.log('ℹ️  profiles.onboarding_completed already exists');
    }

    // Verify
    const cols = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE (table_name = 'agencies' AND column_name IN ('main_niche', 'main_city'))
         OR (table_name = 'profiles' AND column_name = 'onboarding_completed')
      ORDER BY table_name, column_name
    `);
    console.log('\n📋 Verified columns:');
    cols.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name} (${r.data_type})`));
    
    console.log('\n✅ Done!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });

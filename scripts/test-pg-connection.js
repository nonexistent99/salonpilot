import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:94PJ8qjPhGZcEAp!@db.azeukzntqjpmdslgasji.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    console.log('[v0] Conectando ao PostgreSQL...');
    await client.connect();
    console.log('[v0] ✓ Conexão estabelecida!');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('[v0] Timestamp:', result.rows[0].current_time);
    console.log('[v0] Version:', result.rows[0].version.split(',')[0]);

    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('[v0] Tabelas encontradas:', tables.rows.length);
    tables.rows.forEach(row => console.log('  -', row.table_name));

    await client.end();
    console.log('[v0] ✓ Conexão fechada com sucesso');
    process.exit(0);
  } catch (error) {
    console.error('[v0] ✗ Erro:', error.message);
    process.exit(1);
  }
}

test();

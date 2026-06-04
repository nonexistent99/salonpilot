import { Pool, type PoolClient } from 'pg';

let pool: Pool | null = null;

export async function getDbConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('[v0] Pool error:', err);
      pool = null;
    });
  }

  return pool;
}

export async function query(sql: string, values?: any[]) {
  const db = await getDbConnection();
  try {
    const result = await db.query(sql, values);
    return result.rows;
  } catch (error) {
    console.error('[v0] Query error:', error, 'SQL:', sql);
    throw error;
  }
}

export async function queryOne(sql: string, values?: any[]) {
  const rows = await query(sql, values);
  return rows[0] || null;
}

export async function transaction(callback: (client: PoolClient) => Promise<void>) {
  const db = await getDbConnection();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await callback(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

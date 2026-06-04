import { Pool } from 'pg';
import type { PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[GrowthOS] Database pool error:', err);
      pool = null;
    });
  }

  return pool;
}

export async function sql<T = any>(query: string, params?: any[]): Promise<T[]> {
  const p = getPool();
  try {
    const result = await p.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error('[GrowthOS] Query error:', error, 'SQL:', query.substring(0, 200));
    throw error;
  }
}

export async function sqlOne<T = any>(query: string, params?: any[]): Promise<T | null> {
  const rows = await sql<T>(query, params);
  return rows[0] || null;
}

export async function sqlCount(query: string, params?: any[]): Promise<number> {
  const p = getPool();
  const result = await p.query(query, params);
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

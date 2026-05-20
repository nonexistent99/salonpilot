// Legacy hybrid client - now just re-exports from neon
import { sql, sqlOne } from './neon';

export { sql as query, sqlOne as queryOne };

export async function transaction(callback: (client: any) => Promise<any>) {
  const { getPool } = await import('./neon');
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

import crypto from 'node:crypto';
import pg from 'pg';

const { DATABASE_URL, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD } = process.env;
const name = process.env.INITIAL_ADMIN_NAME || 'Administrador SalonPilot';
const salonName = process.env.INITIAL_SALON_NAME || 'SalonPilot Administração';

if (!DATABASE_URL || !INITIAL_ADMIN_EMAIL || !INITIAL_ADMIN_PASSWORD) {
  throw new Error('DATABASE_URL, INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required');
}
if (INITIAL_ADMIN_PASSWORD.length < 12) throw new Error('Initial admin password must have at least 12 characters');

const email = INITIAL_ADMIN_EMAIL.trim().toLowerCase();
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(INITIAL_ADMIN_PASSWORD, salt, 100000, 64, 'sha512').toString('hex');
const passwordHash = `${salt}:${hash}`;
const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

await client.connect();
try {
  await client.query('BEGIN');
  const current = await client.query('SELECT id, salon_id FROM users WHERE email = $1 FOR UPDATE', [email]);
  let salonId = current.rows[0]?.salon_id;
  if (!salonId) {
    const salon = await client.query(
      `INSERT INTO salons (name, owner_name, email, onboarding_completed)
       VALUES ($1, $2, $3, FALSE) RETURNING id`,
      [salonName, name, email],
    );
    salonId = salon.rows[0].id;
  }
  if (current.rows[0]) {
    await client.query(
      `UPDATE users SET name=$2, full_name=$2, password_hash=$3, role='owner', is_admin=TRUE,
       active=TRUE, salon_id=$4, updated_at=NOW() WHERE id=$1`,
      [current.rows[0].id, name, passwordHash, salonId],
    );
  } else {
    await client.query(
      `INSERT INTO users (salon_id, name, full_name, email, password_hash, role, is_admin, active)
       VALUES ($1,$2,$2,$3,$4,'owner',TRUE,TRUE)`,
      [salonId, name, email, passwordHash],
    );
  }
  await client.query('COMMIT');
  console.log(`Initial administrator ready: ${email}`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}

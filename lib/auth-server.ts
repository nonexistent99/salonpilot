import { sql, sqlOne } from '@/lib/db/neon';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE = 'salonpilot_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// ── Password utilities ────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

function generateToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

// ── Types ──────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  full_name?: string | null; // legacy compat
  role: string;
  is_admin: boolean;
  salon_id: string | null;
};

// ── getUser ────────────────────────────────────────────────

export async function getUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    
    // Fallback to old cookie name for backwards compatibility
    const token = sessionCookie?.value || cookieStore.get('growthOS_session')?.value;
    if (!token) return null;

    const session = await sqlOne<{ user_id: string; expires_at: string }>(
      `SELECT user_id, expires_at FROM sessions WHERE token = $1`,
      [token]
    );

    if (!session) return null;

    if (new Date(session.expires_at) < new Date()) {
      await sql(`DELETE FROM sessions WHERE token = $1`, [token]);
      return null;
    }

    const user = await sqlOne<AuthUser>(
      `SELECT id, email, COALESCE(name, full_name) as name, full_name, COALESCE(role, 'owner') as role, is_admin, salon_id 
       FROM users WHERE id = $1`,
      [session.user_id]
    );

    return user;
  } catch (error) {
    console.error('[SalonPilot] Auth getUser error:', error);
    return null;
  }
}

// ── signIn ─────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const row = await sqlOne<{
      id: string;
      email: string;
      name: string;
      full_name: string;
      role: string;
      is_admin: boolean;
      salon_id: string | null;
      password_hash: string;
    }>(
      `SELECT id, email, COALESCE(name, full_name) as name, full_name,
              COALESCE(role, 'owner') as role, is_admin, salon_id, password_hash
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!row) {
      return { user: null, error: 'E-mail ou senha incorretos.' };
    }

    if (!verifyPassword(password, row.password_hash)) {
      return { user: null, error: 'E-mail ou senha incorretos.' };
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    await sql(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [row.id, token, expiresAt.toISOString()]
    );

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return {
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        full_name: row.full_name,
        role: row.role,
        is_admin: row.is_admin,
        salon_id: row.salon_id,
      },
      error: null,
    };
  } catch (error) {
    console.error('[SalonPilot] signIn error:', error);
    return { user: null, error: 'Erro ao conectar. Tente novamente.' };
  }
}

// ── signUp ─────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  name: string,
  salonName: string,
  phone?: string,
  city?: string,
  niche?: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const existing = await sqlOne(`SELECT id FROM users WHERE email = $1`, [
      email.toLowerCase().trim(),
    ]);
    if (existing) {
      return { user: null, error: 'Este e-mail já está cadastrado.' };
    }

    const passwordHash = hashPassword(password);

    // Create salon
    const salon = await sqlOne<{ id: string }>(
      `INSERT INTO salons (name, owner_name, phone, email, city, niche)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [salonName || 'Meu Salão', name, phone || null, email.toLowerCase().trim(), city || null, niche || 'completo']
    );

    if (!salon) {
      return { user: null, error: 'Erro ao criar salão.' };
    }

    // Create user
    const user = await sqlOne<{ id: string; email: string; name: string; is_admin: boolean; salon_id: string }>(
      `INSERT INTO users (email, password_hash, name, full_name, role, salon_id, is_admin)
       VALUES ($1, $2, $3, $3, 'owner', $4, FALSE)
       RETURNING id, email, name, is_admin, salon_id`,
      [email.toLowerCase().trim(), passwordHash, name, salon.id]
    );

    if (!user) {
      return { user: null, error: 'Erro ao criar conta.' };
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    await sql(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt.toISOString()]
    );

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name,
        role: 'owner',
        is_admin: false,
        salon_id: salon.id,
      },
      error: null,
    };
  } catch (error) {
    console.error('[SalonPilot] signUp error:', error);
    return { user: null, error: 'Erro ao criar conta. Tente novamente.' };
  }
}

// ── signOut ────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    const cookieStore = await cookies();
    
    const newCookie = cookieStore.get(SESSION_COOKIE);
    const oldCookie = cookieStore.get('growthOS_session');
    
    const token = newCookie?.value || oldCookie?.value;
    
    if (token) {
      await sql(`DELETE FROM sessions WHERE token = $1`, [token]);
    }
    
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete('growthOS_session');
  } catch (error) {
    console.error('[SalonPilot] signOut error:', error);
  }
}

// ── requireAuth ────────────────────────────────────────────
// Use in API routes: const user = await requireAuth(); if (!user) return 401

export async function requireAuth(): Promise<AuthUser | null> {
  return await getUser();
}

// ── requireSalon ───────────────────────────────────────────
// Returns salon_id or null

export async function requireSalon(): Promise<{ user: AuthUser; salonId: string } | null> {
  const user = await getUser();
  if (!user || !user.salon_id) return null;
  return { user, salonId: user.salon_id };
}

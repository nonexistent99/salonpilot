import { timingSafeEqual } from 'node:crypto';
import { getUser } from '@/lib/auth-server';
import { transaction } from '@/lib/db/neon';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Entre na conta que será administradora.' }, { status: 401 });
  const expected = process.env.ADMIN_SETUP_TOKEN;
  const token = String((await request.json().catch(() => ({}))).token || '');
  if (!expected || token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 403 });
  }
  const promoted = await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(828341)');
    const existing = await client.query('SELECT 1 FROM users WHERE is_admin = TRUE LIMIT 1');
    if (existing.rowCount) return false;
    await client.query('UPDATE users SET is_admin = TRUE, updated_at = NOW() WHERE id = $1', [user.id]);
    return true;
  });
  if (!promoted) return NextResponse.json({ error: 'Administrador já configurado.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}

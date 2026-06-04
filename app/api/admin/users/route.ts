import { requireAdmin } from '@/lib/admin-guard';
import { hashPassword } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';
import { auditAdminAction } from '@/services/admin/settings-service';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const users = await sql(
    `SELECT u.id, u.name, u.full_name, u.email, u.role, u.is_admin, u.active, u.salon_id,
            u.created_at, u.updated_at, s.name as salon_name, s.plan
     FROM users u
     LEFT JOIN salons s ON s.id = u.salon_id
     ORDER BY u.created_at DESC`
  );

  return NextResponse.json({
    users: users.map((user: any) => ({
      ...user,
      full_name: user.full_name || user.name,
      role: user.is_admin ? 'admin' : user.role,
      agency_id: user.salon_id,
      onboarding_completed: true,
      subscription: {
        plan: user.plan || 'free',
        status: user.active ? 'active' : 'inactive',
        searches_used: 0,
        ai_credits_used: 0,
        music_used: 0,
      },
      credits: 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const adminUser = guard.user;
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: 'name, email e password sao obrigatorios.' }, { status: 400 });
  }

  const user = await sqlOne(
    `INSERT INTO users (salon_id, name, full_name, email, password_hash, role, is_admin, active)
     VALUES ($1, $2, $2, $3, $4, $5, $6, TRUE)
     RETURNING id, email, name, role, is_admin, salon_id`,
    [
      body.salon_id || null,
      body.name,
      String(body.email).toLowerCase().trim(),
      hashPassword(body.password),
      body.role || 'owner',
      Boolean(body.is_admin),
    ]
  );

  await auditAdminAction({
    adminUserId: adminUser.id,
    action: 'user.created',
    entityType: 'user',
    entityId: (user as any)?.id,
  });

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const adminUser = guard.user;
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { userId, action, value } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
  }

  switch (action) {
    case 'change_role':
      await sql(
        `UPDATE users SET role = $2, is_admin = $3, updated_at = NOW() WHERE id = $1`,
        [userId, value, value === 'admin']
      );
      break;
    case 'deactivate':
      await sql(`UPDATE users SET active = FALSE, updated_at = NOW() WHERE id = $1`, [userId]);
      break;
    case 'activate':
      await sql(`UPDATE users SET active = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
      break;
    case 'associate_salon':
      await sql(`UPDATE users SET salon_id = $2, updated_at = NOW() WHERE id = $1`, [userId, value || null]);
      break;
    case 'reset_password':
      if (!value) return NextResponse.json({ error: 'Nova senha obrigatoria.' }, { status: 400 });
      await sql(`UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [userId, hashPassword(value)]);
      break;
    case 'change_plan':
      await sql(
        `UPDATE salons
         SET plan = $2, updated_at = NOW()
         WHERE id = (SELECT salon_id FROM users WHERE id = $1)`,
        [userId, value || 'free']
      );
      break;
    case 'add_credits':
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  await auditAdminAction({
    adminUserId: adminUser.id,
    action: `user.${action}`,
    entityType: 'user',
    entityId: userId,
    metadata: { value: action === 'reset_password' ? '[redacted]' : value },
  });

  return NextResponse.json({ success: true });
}

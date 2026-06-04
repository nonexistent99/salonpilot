import { requireAdmin } from '@/lib/admin-guard';
import { sql, sqlOne } from '@/lib/db/neon';
import { auditAdminAction } from '@/services/admin/settings-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const salons = await sql(
    `SELECT s.*,
            COUNT(DISTINCT u.id) as users_count,
            COUNT(DISTINCT c.id) as customers_count,
            COUNT(DISTINCT t.id) as conversations_count,
            COALESCE(SUM(ar.estimated_cost_usd), 0) as ai_cost_usd
     FROM salons s
     LEFT JOIN users u ON u.salon_id = s.id
     LEFT JOIN customers c ON c.salon_id = s.id
     LEFT JOIN conversation_threads t ON t.salon_id = s.id
     LEFT JOIN ai_runs ar ON ar.salon_id = s.id AND ar.created_at >= date_trunc('month', NOW())
     GROUP BY s.id
     ORDER BY s.created_at DESC`
  );

  return NextResponse.json({ salons });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const adminUser = guard.user;
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name obrigatorio.' }, { status: 400 });

  const salon = await sqlOne(
    `INSERT INTO salons (name, owner_name, phone, email, city, niche, plan)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      body.name,
      body.owner_name || null,
      body.phone || null,
      body.email || null,
      body.city || null,
      body.niche || 'completo',
      body.plan || 'free',
    ]
  );

  await auditAdminAction({
    adminUserId: adminUser.id,
    action: 'salon.created',
    entityType: 'salon',
    entityId: (salon as any)?.id,
  });

  return NextResponse.json({ salon });
}

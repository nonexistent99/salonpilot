import { requireAdmin } from '@/lib/admin-guard';
import { listPlatformSettings, setPlatformSetting, auditAdminAction } from '@/services/admin/settings-service';
import { NextResponse } from 'next/server';

const SECRET_KEYS = new Set(['OPENAI_API_KEY', 'EVOLUTION_GLOBAL_API_KEY', 'STRIPE_SECRET_KEY']);

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const settings = await listPlatformSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json();
  const key = String(body.key || '').trim();
  if (!key) return NextResponse.json({ error: 'key obrigatoria.' }, { status: 400 });

  const isSecret = body.is_secret ?? SECRET_KEYS.has(key);
  const setting = await setPlatformSetting({
    key,
    value: body.value,
    isSecret,
    description: body.description || null,
    updatedBy: guard.user.id,
  });

  await auditAdminAction({
    adminUserId: guard.user.id,
    action: 'setting.updated',
    entityType: 'platform_setting',
    entityId: key,
    metadata: { is_secret: isSecret },
  });

  return NextResponse.json({ setting });
}

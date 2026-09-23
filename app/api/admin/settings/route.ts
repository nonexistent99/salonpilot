import { requireAdmin } from '@/lib/admin-guard';
import { listPlatformSettings, setPlatformSetting, auditAdminAction } from '@/services/admin/settings-service';
import { NextResponse } from 'next/server';

const SECRET_KEYS = new Set(['OPENAI_API_KEY', 'EVOLUTION_GLOBAL_API_KEY', 'SUNIZE_API_KEY', 'SUNIZE_API_SECRET']);
const ALLOWED_KEYS = new Set([...SECRET_KEYS, 'OPENAI_MODEL_FAST', 'OPENAI_MODEL_STRATEGIC', 'EVOLUTION_BASE_URL']);

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const settings = await listPlatformSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const adminUser = guard.user;
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const key = String(body.key || '').trim();
  if (!ALLOWED_KEYS.has(key) || typeof body.value !== 'string' || !body.value.trim() || body.value.length > 2048) return NextResponse.json({ error: 'Configuração inválida.' }, { status: 400 });

  const isSecret = SECRET_KEYS.has(key);
  const setting = await setPlatformSetting({
    key,
    value: body.value,
    isSecret,
    description: body.description || null,
    updatedBy: adminUser.id,
  });

  await auditAdminAction({
    adminUserId: adminUser.id,
    action: 'setting.updated',
    entityType: 'platform_setting',
    entityId: key,
    metadata: { is_secret: isSecret },
  });

  return NextResponse.json({ setting });
}

import { sql, sqlOne } from '@/lib/db/neon';
import { decryptSecret, encryptSecret, maskSecret } from './encryption-service';

type SettingRow = {
  key: string;
  value_json: unknown;
  value_encrypted: string | null;
  is_secret: boolean;
  description?: string | null;
  updated_at?: string;
};

export async function getPlatformSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await sqlOne<SettingRow>(
    `SELECT key, value_json, value_encrypted, is_secret FROM platform_settings WHERE key = $1`,
    [key]
  );

  if (!row) return null;
  if (row.is_secret) return decryptSecret(row.value_encrypted) as T | null;
  return row.value_json as T | null;
}

export async function getMaskedPlatformSetting(key: string): Promise<string | null> {
  const row = await sqlOne<SettingRow>(
    `SELECT value_encrypted, is_secret, value_json FROM platform_settings WHERE key = $1`,
    [key]
  );

  if (!row) return null;
  if (!row.is_secret) return typeof row.value_json === 'string' ? row.value_json : JSON.stringify(row.value_json ?? null);
  return maskSecret(decryptSecret(row.value_encrypted));
}

export async function setPlatformSetting(args: {
  key: string;
  value: unknown;
  isSecret?: boolean;
  description?: string | null;
  updatedBy?: string;
}) {
  const isSecret = Boolean(args.isSecret);
  const encrypted = isSecret && typeof args.value === 'string' ? encryptSecret(args.value) : null;
  const valueJson = isSecret ? null : args.value ?? null;

  const [row] = await sql(
    `INSERT INTO platform_settings (key, value_json, value_encrypted, is_secret, description, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value_json = EXCLUDED.value_json,
                   value_encrypted = EXCLUDED.value_encrypted,
                   is_secret = EXCLUDED.is_secret,
                   description = EXCLUDED.description,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW()
     RETURNING key, is_secret, updated_at`,
    [
      args.key,
      isSecret ? null : JSON.stringify(valueJson),
      encrypted,
      isSecret,
      args.description || null,
      args.updatedBy || null,
    ]
  );

  return row;
}

export async function listPlatformSettings() {
  const rows = await sql<SettingRow>(
    `SELECT key, value_json, value_encrypted, is_secret, description, updated_at
     FROM platform_settings
     ORDER BY key`
  );

  return rows.map((row) => ({
    key: row.key,
    value: row.is_secret ? maskSecret(decryptSecret(row.value_encrypted)) : row.value_json,
    is_secret: row.is_secret,
    description: row.description,
    updated_at: row.updated_at,
  }));
}

export async function getOpenAIKey(): Promise<string | null> {
  return process.env.OPENAI_API_KEY || await getPlatformSetting<string>('OPENAI_API_KEY');
}

export async function getEvolutionGlobalKey(): Promise<string | null> {
  return process.env.EVOLUTION_GLOBAL_API_KEY || await getPlatformSetting<string>('EVOLUTION_GLOBAL_API_KEY');
}

export async function getEvolutionBaseUrl(): Promise<string | null> {
  const fromSetting = await getPlatformSetting<string>('EVOLUTION_BASE_URL');
  return process.env.EVOLUTION_BASE_URL || fromSetting;
}

export async function auditAdminAction(args: {
  adminUserId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await sql(
    `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      args.adminUserId,
      args.action,
      args.entityType || null,
      args.entityId || null,
      JSON.stringify(args.metadata || {}),
    ]
  );
}

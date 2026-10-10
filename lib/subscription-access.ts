import { sqlOne } from '@/lib/db/neon';

export async function hasActiveSubscription(salonId: string): Promise<boolean> {
  const row = await sqlOne<{ id: string }>(
    `SELECT id FROM billing_subscriptions WHERE salon_id = $1 AND status = 'ACTIVE' LIMIT 1`, [salonId]);
  return Boolean(row);
}

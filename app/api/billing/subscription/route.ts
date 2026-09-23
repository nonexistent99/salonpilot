import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne } from '@/lib/db/neon';

export async function GET() {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const subscription = await sqlOne<{ plan: string; status: string; next_payment_date: string | null }>(
    `SELECT plan, status, next_payment_date FROM billing_subscriptions
     WHERE salon_id = $1 ORDER BY created_at DESC LIMIT 1`, [auth.salonId]);
  return NextResponse.json({ subscription: subscription || null });
}

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { sqlOne, transaction } from '@/lib/db/neon';
import { sunizeRequest } from '@/lib/sunize';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.SUNIZE_API_SECRET;
  const received = req.headers.get('x-api-secret') || '';
  if (!secret || !received || !timingSafeEqual(Buffer.from(secret), Buffer.from(received))) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  try {
    const event = await req.json();
    if (!String(event.event || '').startsWith('SUBSCRIPTION_') || typeof event.id !== 'string') {
      return NextResponse.json({ ignored: true });
    }
    const row = await sqlOne<{ salon_id: string; external_id: string; plan: string; amount: string }>(
      'SELECT salon_id, external_id, plan, amount FROM billing_subscriptions WHERE provider_id = $1', [event.id]);
    if (!row) return NextResponse.json({ ignored: true });
    // The API is authoritative even if webhook deliveries arrive out of order.
    const remote = await sunizeRequest<{ external_id: string; status: string; amount: number; next_payment_date?: string | null }>(
      `/subscriptions/${encodeURIComponent(event.id)}`);
    if (remote.external_id !== row.external_id || Number(remote.amount) !== Number(row.amount) ||
        !['ACTIVE', 'PENDING_AUTHORIZATION', 'LATE', 'PAUSED', 'CANCELED'].includes(remote.status)) {
      return NextResponse.json({ error: 'Dados da assinatura divergentes.' }, { status: 409 });
    }
    await transaction(async client => {
      await client.query(`UPDATE billing_subscriptions SET status = $2, next_payment_date = $3, updated_at = NOW()
        WHERE provider_id = $1`, [event.id, remote.status, remote.next_payment_date || null]);
      const active = await client.query(`SELECT plan, next_payment_date FROM billing_subscriptions
        WHERE salon_id = $1 AND status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 1`, [row.salon_id]);
      await client.query(`UPDATE salons SET plan = $2, plan_expires_at = $3 WHERE id = $1`,
        [row.salon_id, active.rows[0]?.plan || 'free', active.rows[0]?.next_payment_date || null]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[billing webhook]', error);
    return NextResponse.json({ error: 'Falha ao processar evento.' }, { status: 503 });
  }
}

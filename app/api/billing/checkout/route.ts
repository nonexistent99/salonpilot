import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne } from '@/lib/db/neon';
import { plans, sunizeRequest } from '@/lib/sunize';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Entre na sua conta para assinar.' }, { status: 401 });
  try {
    const { planId, name, phone, document } = await req.json();
    const plan = plans[planId as keyof typeof plans];
    if (!plan) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const cleanDocument = String(document || '').replace(/\D/g, '');
    if (String(name || '').trim().length < 3 || !/^55\d{10,11}$/.test(cleanPhone) || !/^\d{11}$/.test(cleanDocument)) {
      return NextResponse.json({ error: 'Confira nome, celular com DDD e CPF.' }, { status: 400 });
    }
    const existing = await sqlOne<{ id: string; status: string; pix_link: string | null }>(
      `SELECT id, status, pix_link FROM billing_subscriptions WHERE salon_id = $1
       AND status IN ('ACTIVE', 'PENDING_AUTHORIZATION') ORDER BY created_at DESC LIMIT 1`, [auth.salonId]);
    if (existing?.status === 'ACTIVE') return NextResponse.json({ error: 'Seu salão já tem uma assinatura ativa. Cancele antes de trocar de plano.' }, { status: 409 });
    if (existing?.pix_link) return NextResponse.json({ id: existing.id, status: existing.status, url: existing.pix_link });

    const externalId = crypto.randomUUID();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const subscription = await sunizeRequest<{ id: string; status: string; pix?: { payment_link?: string; qr_code?: string } }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        external_id: externalId, amount: plan.amount, payment_method: 'PIX', membership_period: 'MENSAL',
        items: [{ id: planId, title: `SalonPilot ${plan.name}`, description: 'Assinatura mensal', price: plan.amount, quantity: 1, is_physical: false }],
        ip, customer: { name: String(name).trim(), email: auth.user.email, phone: `+${cleanPhone}`, document_type: 'CPF', document: cleanDocument },
      }),
    });
    if (!subscription.id || !subscription.pix?.payment_link) throw new Error('A Sunize não retornou o link de autorização Pix.');
    await sqlOne(
      `INSERT INTO billing_subscriptions (salon_id, external_id, provider_id, plan, amount, status, pix_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [auth.salonId, externalId, subscription.id, planId, plan.amount, 'PENDING_AUTHORIZATION', subscription.pix.payment_link]);
    return NextResponse.json({ id: subscription.id, status: 'PENDING_AUTHORIZATION', url: subscription.pix.payment_link });
  } catch (error) {
    console.error('[billing checkout]', error);
    return NextResponse.json({ error: 'Não foi possível iniciar a assinatura. Tente novamente.' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { trackEvent, type EventType } from '@/services/growth-intelligence';

// POST /api/intelligence/events
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { event_type, customer_id, channel, source, event_text, structured_data, occurred_at } = body;

    if (!event_type) return NextResponse.json({ error: 'event_type obrigatório.' }, { status: 400 });

    await trackEvent({
      salonId: auth.salonId,
      customerId: customer_id,
      eventType: event_type as EventType,
      channel,
      source,
      eventText: event_text,
      structuredData: structured_data,
      occurredAt: occurred_at ? new Date(occurred_at) : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API /intelligence/events]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { createAppointment, listAppointments } from '@/services/appointments/appointment-service';

export async function GET(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const appointments = await listAppointments({
      salonId: auth.salonId,
      date: searchParams.get('date'),
    });

    return NextResponse.json({ appointments });
  } catch (err) {
    console.error('[API /appointments GET]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

    const body = await req.json();
    const { customer_id, service_id, professional_id, start_time, notes } = body;

    if (!customer_id || !service_id || !start_time) {
      return NextResponse.json({ error: 'customer_id, service_id e start_time sao obrigatorios.' }, { status: 400 });
    }

    const result = await createAppointment({
      salonId: auth.salonId,
      customerId: customer_id,
      serviceId: service_id,
      professionalId: professional_id || null,
      startTime: start_time,
      notes: notes || null,
      source: 'manual',
    });

    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (err) {
    console.error('[API /appointments POST]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

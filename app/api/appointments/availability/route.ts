import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { listAvailableSlots } from '@/services/appointments/availability-service';

export async function GET(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('service_id');
  const date = searchParams.get('date');

  if (!serviceId || !date) {
    return NextResponse.json({ error: 'service_id e date sao obrigatorios.' }, { status: 400 });
  }

  const result = await listAvailableSlots({
    salonId: auth.salonId,
    serviceId,
    date,
    professionalId: searchParams.get('professional_id'),
  });

  return NextResponse.json(result);
}

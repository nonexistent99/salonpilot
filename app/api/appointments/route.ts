import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql } from '@/lib/db/neon';

export async function GET(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    let whereDate = '';
    const params: unknown[] = [auth.salonId];

    if (dateStr) {
      whereDate = ` AND DATE(a.start_time AT TIME ZONE 'America/Sao_Paulo') = $2`;
      params.push(dateStr);
    }

    const appointments = await sql(
      `SELECT a.*,
        c.name as customer_name, c.phone as customer_phone,
        s.name as service_name, s.price as service_price,
        p.name as professional_name
       FROM appointments a
       LEFT JOIN customers c ON c.id = a.customer_id
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN professionals p ON p.id = a.professional_id
       WHERE a.salon_id = $1${whereDate}
       ORDER BY a.start_time`,
      params
    );

    return NextResponse.json({ appointments });
  } catch (err) {
    console.error('[API /appointments GET]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { customer_id, service_id, professional_id, start_time, notes, value } = body;

    if (!start_time) {
      return NextResponse.json({ error: 'Horário é obrigatório.' }, { status: 400 });
    }

    const apt = await sql(
      `INSERT INTO appointments (salon_id, customer_id, service_id, professional_id, start_time, notes, value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
       RETURNING *`,
      [auth.salonId, customer_id || null, service_id || null, professional_id || null,
       start_time, notes || null, value || 0]
    );

    return NextResponse.json(apt[0]);
  } catch (err) {
    console.error('[API /appointments POST]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

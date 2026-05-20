import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';

export async function GET(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';

    let where = `WHERE salon_id = $1`;
    const params: unknown[] = [auth.salonId];

    if (status) {
      where += ` AND status = $2`;
      params.push(status);
    }

    const campaigns = await sql(
      `SELECT * FROM campaigns ${where} ORDER BY created_at DESC`,
      params
    );

    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error('[API /campaigns GET]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { name, objective, channel, audience_filter_json, offer_type, offer_description, message, generated_by_ai, scheduled_at } = body;

    if (!name || !objective || !message) {
      return NextResponse.json({ error: 'Nome, objetivo e mensagem são obrigatórios.' }, { status: 400 });
    }

    const campaign = await sqlOne(
      `INSERT INTO campaigns (salon_id, name, objective, channel, status, audience_filter_json, offer_type, offer_description, message, generated_by_ai, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        auth.salonId, name, objective,
        channel || 'whatsapp',
        audience_filter_json ? JSON.stringify(audience_filter_json) : '{}',
        offer_type || null, offer_description || null,
        message, generated_by_ai || false,
        scheduled_at || null, auth.user.id
      ]
    );

    return NextResponse.json(campaign);
  } catch (err) {
    console.error('[API /campaigns POST]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

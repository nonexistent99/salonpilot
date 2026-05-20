import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';

export async function GET(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const tag = searchParams.get('tag') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let where = `WHERE c.salon_id = $1`;
    const params: unknown[] = [auth.salonId];
    let paramIdx = 2;

    if (search) {
      where += ` AND (c.name ILIKE $${paramIdx} OR c.phone ILIKE $${paramIdx} OR c.instagram ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status) {
      where += ` AND c.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (tag) {
      where += ` AND EXISTS (
        SELECT 1 FROM customer_tag_relations ctr
        JOIN customer_tags ct ON ct.id = ctr.tag_id
        WHERE ctr.customer_id = c.id AND ct.name = $${paramIdx}
      )`;
      params.push(tag);
      paramIdx++;
    }

    const customers = await sql(
      `SELECT c.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', ct.id, 'name', ct.name, 'color', ct.color))
          FILTER (WHERE ct.id IS NOT NULL), '[]'
        ) as tags
       FROM customers c
       LEFT JOIN customer_tag_relations ctr ON ctr.customer_id = c.id
       LEFT JOIN customer_tags ct ON ct.id = ctr.tag_id
       ${where}
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    // Count total
    const countRes = await sqlOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM customers c ${where}`,
      params
    );
    const total = parseInt(countRes?.count || '0');

    return NextResponse.json({ customers, total, page, limit });
  } catch (err) {
    console.error('[API /customers GET]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { name, phone, instagram, email, birth_date, source, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const customer = await sqlOne(
      `INSERT INTO customers (salon_id, name, phone, instagram, email, birth_date, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [auth.salonId, name, phone || null, instagram || null, email || null,
       birth_date || null, source || 'manual', notes || null]
    );

    return NextResponse.json(customer);
  } catch (err) {
    console.error('[API /customers POST]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

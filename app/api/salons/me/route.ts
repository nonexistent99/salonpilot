import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';

// GET /api/salons/me — retorna dados do salão atual
export async function GET() {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const salon = await sqlOne(
      `SELECT s.*,
        u.email, u.full_name as owner_name_user
       FROM salons s
       LEFT JOIN users u ON u.id = s.owner_id
       WHERE s.id = $1`,
      [auth.salonId]
    );

    if (!salon) return NextResponse.json({ error: 'Salão não encontrado.' }, { status: 404 });

    return NextResponse.json(salon);
  } catch (err) {
    console.error('[API /salons/me GET]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// PATCH /api/salons/me — atualiza dados do salão
export async function PATCH(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { name, phone, email, city, instagram, niche, goal, owner_name, whatsapp } = body;

    // Build dynamic SET clause
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowed = { name, phone, email, city, instagram, niche, goal, owner_name, whatsapp };
    for (const [key, val] of Object.entries(allowed)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    values.push(auth.salonId);
    const salon = await sqlOne(
      `UPDATE salons SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    return NextResponse.json(salon);
  } catch (err) {
    console.error('[API /salons/me PATCH]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

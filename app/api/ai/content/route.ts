import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sql, sqlOne } from '@/lib/db/neon';
import { generateInstagramContent } from '@/services/ai/ai-service';

export async function GET(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  const params: unknown[] = [auth.salonId];
  let where = `WHERE salon_id = $1`;
  let index = 2;
  if (status) {
    where += ` AND status = $${index}`;
    params.push(status);
    index++;
  }
  if (type) {
    where += ` AND type = $${index}`;
    params.push(type);
  }

  const contents = await sql(
    `SELECT *
     FROM instagram_contents
     ${where}
     ORDER BY created_at DESC
     LIMIT 100`,
    params
  );

  return NextResponse.json({ contents });
}

export async function POST(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const body = await request.json();
  const result = await generateInstagramContent({
    salonId: auth.salonId,
    userId: auth.user.id,
    type: body.type || 'post',
    objective: body.objective || null,
    prompt: body.prompt || body.question || null,
  });

  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const auth = await requireSalon();
  if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

  const body = await request.json();
  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'id e status sao obrigatorios.' }, { status: 400 });
  }

  const content = await sqlOne(
    `UPDATE instagram_contents
     SET status = $3, updated_at = NOW()
     WHERE salon_id = $1 AND id = $2
     RETURNING *`,
    [auth.salonId, body.id, body.status]
  );

  return NextResponse.json({ content });
}

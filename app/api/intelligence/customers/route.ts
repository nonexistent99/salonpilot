import { NextRequest, NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { analyzeCustomer } from '@/services/growth-intelligence';
import { sql } from '@/lib/db/neon';

// GET /api/intelligence/customers — list customers with AI scores
export async function GET(req: NextRequest) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sort') ?? 'retention_risk';
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const orderCol = sortBy === 'value' ? 'value_score DESC' :
      sortBy === 'retention_risk' ? 'retention_risk_score DESC' :
        'last_ai_analysis_at DESC NULLS LAST';

    const customers = await sql(
      `SELECT id, name, phone, status, value_score, retention_risk_score,
              next_best_action, ai_summary, preferred_channel, likely_interest, last_ai_analysis_at
       FROM customers WHERE salon_id=$1 ORDER BY ${orderCol} LIMIT $2`,
      [auth.salonId, limit]
    );

    return NextResponse.json({ customers });
  } catch (err) {
    console.error('[API /intelligence/customers GET]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// POST /api/intelligence/customers/:id/analyze
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { customer_id } = await req.json();
    if (!customer_id) return NextResponse.json({ error: 'customer_id obrigatório.' }, { status: 400 });

    await analyzeCustomer(auth.salonId, customer_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API /intelligence/customers POST]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

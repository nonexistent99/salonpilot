import { NextRequest, NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { generateAIReport } from '@/services/growth-intelligence';
import { sql } from '@/lib/db/neon';

// GET /api/intelligence/reports  — list reports
export async function GET(req: NextRequest) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'weekly';
    const limit = parseInt(searchParams.get('limit') ?? '5');

    const reports = await sql(
      `SELECT * FROM ai_reports WHERE salon_id=$1 AND report_type=$2 ORDER BY created_at DESC LIMIT $3`,
      [auth.salonId, type, limit]
    );

    return NextResponse.json({ reports });
  } catch (err) {
    console.error('[API /intelligence/reports GET]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// POST /api/intelligence/reports  — generate new report
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { type } = await req.json().catch(() => ({ type: 'weekly' }));
    const reportType = (type as 'daily' | 'weekly' | 'monthly') ?? 'weekly';

    await generateAIReport(auth.salonId, reportType);

    const latest = await sql(
      `SELECT * FROM ai_reports WHERE salon_id=$1 AND report_type=$2 ORDER BY created_at DESC LIMIT 1`,
      [auth.salonId, reportType]
    );

    return NextResponse.json({ report: latest[0] });
  } catch (err) {
    console.error('[API /intelligence/reports POST]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

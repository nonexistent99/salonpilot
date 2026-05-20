import { NextRequest, NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { generateStrategicDecision } from '@/services/growth-intelligence';

// POST /api/intelligence/decision
export async function POST(_req: NextRequest) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const decision = await generateStrategicDecision(auth.salonId);
    return NextResponse.json({ decision });
  } catch (err) {
    console.error('[API /intelligence/decision]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

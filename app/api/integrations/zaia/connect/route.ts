import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { sqlOne } from '@/lib/db/neon';

// POST /api/integrations/zaia/connect — salva credenciais da Zaia
export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const body = await req.json();
    const { api_key, agent_id } = body;

    if (!api_key) {
      return NextResponse.json({ error: 'api_key é obrigatório.' }, { status: 400 });
    }

    // Save integration config to salon settings
    const salon = await sqlOne(
      `UPDATE salons
       SET 
         zaia_api_key = $1,
         zaia_agent_id = $2,
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, name`,
      [api_key, agent_id || null, auth.salonId]
    );

    if (!salon) {
      return NextResponse.json({ error: 'Salão não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Integração com Zaia configurada com sucesso!',
      salon_id: auth.salonId,
    });
  } catch (err) {
    console.error('[API /integrations/zaia/connect]', err);
    // If column doesn't exist yet, return friendly error
    return NextResponse.json({
      success: false,
      error: 'Erro ao salvar configuração. Verifique se o banco de dados foi migrado.',
    }, { status: 500 });
  }
}

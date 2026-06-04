import { NextResponse } from 'next/server';
import { requireSalon } from '@/lib/auth-server';
import { generateInstagramContent, generateOwnerCoach } from '@/services/ai/ai-service';

export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });

    const body = await req.json();
    const { question, type } = body;

    if (type === 'content') {
      const result = await generateInstagramContent({
        salonId: auth.salonId,
        userId: auth.user.id,
        type: body.content_type || body.contentType || 'post',
        objective: body.objective || question || null,
        prompt: question || null,
      });
      return NextResponse.json({
        response: result.response,
        content: result.content,
        provider: result.provider,
        model: result.model,
        ai_run_id: result.ai_run_id,
      });
    }

    const result = await generateOwnerCoach({
      salonId: auth.salonId,
      userId: auth.user.id,
      question,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API /ai/coach]', err);
    return NextResponse.json({ error: 'Erro ao processar com IA.' }, { status: 500 });
  }
}

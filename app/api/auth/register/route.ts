import { NextResponse } from 'next/server';
import { signUp } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, salonName, phone, city, niche } = body;

    if (!email || !password || !name || !salonName) {
      return NextResponse.json(
        { error: 'Nome, e-mail, senha e nome do salão são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const result = await signUp(email, password, name, salonName, phone, city, niche);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ user: result.user });
  } catch (err) {
    console.error('[API /auth/register]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

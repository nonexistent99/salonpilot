import { signUp } from '@/lib/auth-server';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, agency_name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha sao obrigatorios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const { user, error } = await signUp(
      email,
      password,
      full_name || '',
      agency_name || 'Minha Agencia'
    );

    if (error || !user) {
      return NextResponse.json({ error: error || 'Erro ao criar conta.' }, { status: 400 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error('[GrowthOS] SignUp API error:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

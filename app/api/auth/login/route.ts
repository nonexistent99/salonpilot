import { NextResponse } from 'next/server';
import { signIn } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const result = await signIn(email, password);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ user: result.user });
  } catch (err) {
    console.error('[API /auth/login]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

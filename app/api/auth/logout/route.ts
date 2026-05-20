import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth-server';

export async function POST() {
  try {
    await signOut();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /auth/logout]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error('[API /auth/me]', err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

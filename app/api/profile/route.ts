import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name || user.name,
    name: user.name,
    role: user.is_admin ? 'admin' : user.role,
    is_admin: user.is_admin,
    salon_id: user.salon_id,
  });
}

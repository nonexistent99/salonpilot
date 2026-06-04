import { getUser, type AuthUser } from '@/lib/auth-server';

export async function requireAdmin(): Promise<
  | { error: null; status: 200; user: AuthUser }
  | { error: string; status: 401 | 403; user: null }
> {
  const user = await getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401, user: null };
  }

  if (!user.is_admin && user.role !== 'admin') {
    return { error: 'Forbidden', status: 403, user: null };
  }

  return { error: null, status: 200, user };
}

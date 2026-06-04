/**
 * Client-side auth helper.
 * Replaces the Supabase browser client with API-based auth.
 */

type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
};

class GrowthOSClient {
  private _cachedUser: AuthUser | null | undefined = undefined;

  auth = {
    getUser: async (): Promise<{ data: { user: AuthUser | null } }> => {
      if (this._cachedUser !== undefined) {
        return { data: { user: this._cachedUser } };
      }

      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          this._cachedUser = null;
          return { data: { user: null } };
        }
        const data = await res.json();
        this._cachedUser = data.user || null;
        const user = this._cachedUser ?? null;
        return { data: { user } };
      } catch {
        this._cachedUser = null;
        return { data: { user: null } };
      }
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          return { data: null, error: { message: data.error || 'Erro ao fazer login.' } };
        }
        this._cachedUser = data.user;
        return { data: { user: data.user }, error: null };
      } catch (err) {
        return { data: null, error: { message: 'Erro de conexao.' } };
      }
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            full_name: options?.data?.full_name || '',
            agency_name: options?.data?.agency_name || 'Minha Agencia',
          }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          return { data: null, error: { message: data.error || 'Erro ao criar conta.' } };
        }
        this._cachedUser = data.user;
        return { data: { user: data.user }, error: null };
      } catch (err) {
        return { data: null, error: { message: 'Erro de conexao.' } };
      }
    },

    signOut: async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        this._cachedUser = null;
      } catch {}
    },

    onAuthStateChange: (_event: string, _callback: (event: string, session: unknown) => void) => {
      // No-op for now - auth state is managed via cookies
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  };

  from(_table: string) {
    // Client-side queries go through API routes, not direct DB
    console.warn('[GrowthOS] Client-side .from() called. Use API routes instead.');
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          limit: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
        single: async () => ({ data: null, error: null }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ then: async () => ({ data: null, error: null }) }) }),
    };
  }
}

let client: GrowthOSClient | null = null;

export function createClient() {
  if (!client) {
    client = new GrowthOSClient();
  }
  return client;
}

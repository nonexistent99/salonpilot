export const plans = {
  starter: { name: 'Essencial', amount: 97 },
  enterprise: { name: 'Crescimento', amount: 497 },
} as const;

export async function sunizeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.SUNIZE_API_KEY;
  const secret = process.env.SUNIZE_API_SECRET;
  if (!key || !secret) throw new Error('Credenciais Sunize ausentes');
  const res = await fetch(`https://api.sunize.com.br/v2${path}`, {
    ...init,
    headers: { 'x-api-key': key, 'x-api-secret': secret, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Sunize retornou HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

import crypto from 'crypto';

function timingSafeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function isInternalJobAuthorized(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.INTERNAL_JOB_SECRET].filter(Boolean) as string[];
  if (secrets.length === 0) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;
  const candidates = [
    bearerToken,
    request.headers.get('x-cron-secret'),
    request.headers.get('x-internal-job-secret'),
  ].filter(Boolean) as string[];

  return candidates.some((candidate) => secrets.some((secret) => timingSafeEquals(candidate, secret)));
}

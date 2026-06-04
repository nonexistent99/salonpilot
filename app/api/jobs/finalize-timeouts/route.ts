import { NextResponse } from 'next/server';
import { isInternalJobAuthorized } from '@/lib/internal-job-auth';
import { finalizeTimedOutThreads } from '@/services/ai/timeout-finalizer';

export async function POST(request: Request) {
  if (!isInternalJobAuthorized(request)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await finalizeTimedOutThreads({ limit: body.limit });

  return NextResponse.json(result);
}

import { NextResponse } from 'next/server';
import { isInternalJobAuthorized } from '@/lib/internal-job-auth';
import { processDueMessageBatches } from '@/services/messaging/batch-processor';

export async function POST(request: Request) {
  if (!isInternalJobAuthorized(request)) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await processDueMessageBatches({
    salonId: body.salon_id || null,
    limit: body.limit,
    sendOutbound: body.send_outbound !== false,
  });

  return NextResponse.json(result);
}

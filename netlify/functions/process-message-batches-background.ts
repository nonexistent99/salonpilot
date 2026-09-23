import { timingSafeEqual } from 'node:crypto';
import { processDueMessageBatches } from '../../services/messaging/batch-processor';

export default async function (req: Request) {
  const expected = Netlify.env.get('INTERNAL_JOB_SECRET');
  const received = req.headers.get('x-internal-job-secret');
  if (!expected || !received || expected.length !== received.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return new Response('Unauthorized', { status: 401 });
  const result = await processDueMessageBatches({ limit: 10 });
  console.log('Message batches processed:', result.processed);
  return new Response('OK');
}

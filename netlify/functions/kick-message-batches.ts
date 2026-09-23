import type { Config } from '@netlify/functions';

export default async function () {
  const site = Netlify.env.get('URL');
  const secret = Netlify.env.get('INTERNAL_JOB_SECRET');
  if (!site || !secret) throw new Error('URL or INTERNAL_JOB_SECRET missing');
  const response = await fetch(`${site}/.netlify/functions/process-message-batches-background`, {
    method: 'POST', headers: { 'x-internal-job-secret': secret },
  });
  if (!response.ok) throw new Error(`Batch worker returned ${response.status}`);
}

export const config: Config = { schedule: '* * * * *' };

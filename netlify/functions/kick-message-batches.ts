import type { Config, Context } from "@netlify/functions";
export default async (_request: Request, context: Context) => {
  const secret =
    Netlify.env.get("INTERNAL_JOB_SECRET") || Netlify.env.get("CRON_SECRET");
  if (!secret) throw new Error("Internal job secret is not configured");
  const response = await fetch(
    new URL(
      "/.netlify/functions/process-message-batches-background",
      context.site.url,
    ),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("Unable to start message worker");
  return new Response(null, { status: 204 });
};
export const config: Config = { schedule: "* * * * *" };

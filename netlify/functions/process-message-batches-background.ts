import type { Context } from "@netlify/functions";
import { safeEqual } from "../../services/messaging/webhook-auth";

export default async (request: Request, context: Context) => {
  const secret =
    Netlify.env.get("INTERNAL_JOB_SECRET") || Netlify.env.get("CRON_SECRET");
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer /i, "");
  if (!secret || !provided || !safeEqual(secret, provided))
    return new Response("Forbidden", { status: 403 });
  const response = await fetch(
    new URL("/api/jobs/message-batches", context.site.url),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 3 }),
      signal: AbortSignal.timeout(120000),
    },
  );
  if (!response.ok)
    throw new Error(`Message worker refused job: HTTP ${response.status}`);
  return new Response(null, { status: 204 });
};

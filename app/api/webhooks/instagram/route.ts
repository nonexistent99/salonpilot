import { NextResponse } from "next/server";
import { sqlOne } from "@/lib/db/neon";
import {
  safeEqual,
  validMetaSignature,
} from "@/services/messaging/webhook-auth";
import { ingestInstagramEvent } from "@/services/messaging/instagram-ingest";
import type { InstagramAccount } from "@/services/social/instagram";
export async function GET(req: Request) {
  const query = new URL(req.url).searchParams;
  const secret = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (
    secret &&
    query.get("hub.mode") === "subscribe" &&
    safeEqual(query.get("hub.verify_token") || "", secret)
  )
    return new Response(query.get("hub.challenge") || "");
  return new Response("Forbidden", { status: 403 });
}
export async function POST(req: Request) {
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 1_000_000)
    return new Response("Too large", { status: 413 });
  if (
    !validMetaSignature(
      raw,
      req.headers.get("x-hub-signature-256"),
      process.env.META_APP_SECRET,
    )
  )
    return new Response("Forbidden", { status: 403 });
  try {
    const payload = JSON.parse(raw);
    if (payload.object !== "instagram")
      return NextResponse.json({ ok: true, ignored: true });
    for (const entry of payload.entry || []) {
      const account = await sqlOne<InstagramAccount>(
        "SELECT * FROM instagram_accounts WHERE instagram_user_id=$1 AND status='connected'",
        [String(entry.id)],
      );
      if (!account) continue;
      for (const event of entry.messaging || [])
        await ingestInstagramEvent(account, event);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to persist event" },
      { status: 503 },
    );
  }
}

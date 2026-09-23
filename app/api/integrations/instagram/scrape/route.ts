import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSalon } from "@/lib/auth-server";
import { apiError } from "@/lib/api-error";
import { sql } from "@/lib/db/neon";
import {
  startProfileScrape,
  pollProfileScrape,
} from "@/services/social/profile-scraper";
export async function POST() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      await startProfileScrape({ salonId: auth.salonId, userId: auth.user.id }),
      { status: 202 },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function GET(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id)
      return NextResponse.json({
        jobs: await sql(
          "SELECT id,username,status,created_at FROM instagram_scrape_jobs WHERE salon_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 5",
          [auth.salonId, auth.user.id],
        ),
      });
    return NextResponse.json(
      await pollProfileScrape(
        { salonId: auth.salonId, userId: auth.user.id },
        z.string().uuid().parse(id),
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}

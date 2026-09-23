import { NextResponse } from "next/server";
import { requireSalon } from "@/lib/auth-server";
import { apiError } from "@/lib/api-error";
import { sql } from "@/lib/db/neon";
import { generateStrategy } from "@/services/ai/strategy";
export async function GET() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      {
        reports: await sql(
          "SELECT id,report,created_at FROM strategy_reports WHERE salon_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 10",
          [auth.salonId, auth.user.id],
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      await generateStrategy({ salonId: auth.salonId, userId: auth.user.id }),
    );
  } catch (e) {
    return apiError(e);
  }
}

import { NextResponse } from "next/server";
import { requireSalon } from "@/lib/auth-server";
import { apiError, ApiError } from "@/lib/api-error";
import { sqlOne } from "@/lib/db/neon";
import { collectInstagram } from "@/services/social/instagram";
export async function POST() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    const recent = await sqlOne(
      "SELECT id FROM instagram_snapshots WHERE salon_id=$1 AND source='meta_instagram_api' AND collected_at>NOW()-INTERVAL '5 minutes' LIMIT 1",
      [auth.salonId],
    );
    if (recent)
      throw new ApiError(
        429,
        "Os dados foram coletados há menos de 5 minutos.",
      );
    return NextResponse.json({
      snapshot: await collectInstagram(auth.salonId),
    });
  } catch (e) {
    return apiError(e);
  }
}

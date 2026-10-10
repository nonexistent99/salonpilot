import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSalon } from "@/lib/auth-server";
import { apiError } from "@/lib/api-error";
import { sqlOne } from "@/lib/db/neon";
export async function GET() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    return NextResponse.json(
      (await sqlOne(
        "SELECT business_knowledge,tone FROM salon_ai_settings WHERE salon_id=$1",
        [auth.salonId],
      )) || { business_knowledge: "", tone: "Acolhedor e profissional" },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (!["owner", "admin"].includes(auth.user.role))
      return NextResponse.json(
        { error: "Somente responsáveis podem configurar a IA." },
        { status: 403 },
      );
    const body = z
      .object({
        business_knowledge: z.string().max(12000),
        tone: z.string().trim().min(1).max(300),
      })
      .parse(await req.json());
    return NextResponse.json(
      await sqlOne(
        `INSERT INTO salon_ai_settings(salon_id,business_knowledge,tone) VALUES($1,$2,$3) ON CONFLICT(salon_id) DO UPDATE SET business_knowledge=$2,tone=$3,updated_at=NOW() RETURNING business_knowledge,tone`,
        [auth.salonId, body.business_knowledge, body.tone],
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}

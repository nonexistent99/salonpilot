import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSalon } from "@/lib/auth-server";
import { apiError } from "@/lib/api-error";
import {
  listOwnerThreads,
  createOwnerThread,
  ownerHistory,
} from "@/services/ai/owner-chat";
export async function GET(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    const owner = { salonId: auth.salonId, userId: auth.user.id };
    const id = new URL(req.url).searchParams.get("id");
    return NextResponse.json(
      id
        ? await ownerHistory(owner, z.string().uuid().parse(id))
        : { threads: await listOwnerThreads(owner) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    return NextResponse.json({
      thread: await createOwnerThread({
        salonId: auth.salonId,
        userId: auth.user.id,
      }),
    });
  } catch (error) {
    return apiError(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSalon } from "@/lib/auth-server";
import { apiError, ApiError } from "@/lib/api-error";
import { sql, sqlOne, transaction } from "@/lib/db/neon";
import {
  encryptSecret,
  decryptSecret,
} from "@/services/admin/encryption-service";
import { instagramFetch } from "@/services/social/instagram";
export async function GET() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    const account = await sqlOne(
      "SELECT id,username,instagram_user_id,ai_enabled,status FROM instagram_accounts WHERE salon_id=$1",
      [auth.salonId],
    );
    const snapshot = await sqlOne(
      "SELECT id,username,source,profile,posts,collected_at FROM instagram_snapshots WHERE salon_id=$1 ORDER BY collected_at DESC LIMIT 1",
      [auth.salonId],
    );
    return NextResponse.json(
      { account, snapshot },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (!["owner", "admin"].includes(auth.user.role))
      throw new ApiError(403, "Somente responsáveis podem conectar canais.");
    const body = z
      .object({ access_token: z.string().trim().min(20).max(4096) })
      .parse(await req.json());
    // Resolve identity from the token, never trust a client-provided account ID.
    const identity = await instagramFetch(
      body.access_token,
      "me?fields=user_id,username",
    );
    const profile = identity.data?.[0] || identity;
    const id = String(profile.user_id || "");
    if (!/^\d+$/.test(id) || !profile.username)
      throw new ApiError(422, "Token inválido para Instagram Login.");
    const result = await transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`instagram:${id}`],
      );
      const occupied = await client.query(
        "SELECT salon_id FROM instagram_accounts WHERE instagram_user_id=$1",
        [id],
      );
      if (occupied.rowCount && occupied.rows[0].salon_id !== auth.salonId)
        throw new ApiError(
          409,
          "Essa conta já está vinculada a outra empresa.",
        );
      const current = await client.query(
        "SELECT instagram_user_id FROM instagram_accounts WHERE salon_id=$1",
        [auth.salonId],
      );
      if (current.rowCount && current.rows[0].instagram_user_id !== id)
        throw new ApiError(
          409,
          "Renove o token da mesma conta. Trocar a identidade do canal exige migrar o histórico existente.",
        );
      const rows = await client.query(
        `INSERT INTO instagram_accounts(salon_id,instagram_user_id,username,access_token_encrypted) VALUES($1,$2,$3,$4) ON CONFLICT(salon_id) DO UPDATE SET username=$3,access_token_encrypted=$4,status='connected',updated_at=NOW() RETURNING id,username,ai_enabled,status`,
        [auth.salonId, id, profile.username, encryptSecret(body.access_token)],
      );
      return rows.rows[0];
    });
    return NextResponse.json({ account: result });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: Request) {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (!["owner", "admin"].includes(auth.user.role))
      throw new ApiError(403, "Somente responsáveis podem configurar canais.");
    const body = z.object({ ai_enabled: z.boolean() }).parse(await req.json());
    if (
      body.ai_enabled &&
      (!process.env.META_APP_SECRET || !process.env.META_WEBHOOK_VERIFY_TOKEN)
    )
      throw new ApiError(
        503,
        "Configure o aplicativo Meta e o webhook antes de ativar o atendimento.",
      );
    if (body.ai_enabled) {
      const stored = await sqlOne(
        "SELECT instagram_user_id,access_token_encrypted,status FROM instagram_accounts WHERE salon_id=$1",
        [auth.salonId],
      );
      if (!stored) throw new ApiError(404, "Conta não encontrada.");
      if (stored.status !== "connected")
        throw new ApiError(422, "Reconecte a conta antes de ativar a IA.");
      const token = decryptSecret(stored.access_token_encrypted);
      if (!token) throw new ApiError(422, "Reconecte a conta do Instagram.");
      const subscribed = await instagramFetch(
        token,
        `${stored.instagram_user_id}/subscribed_apps`,
        {
          method: "POST",
          body: JSON.stringify({ subscribed_fields: "messages" }),
        },
      );
      if (!subscribed.success)
        throw new ApiError(
          502,
          "Não foi possível habilitar o recebimento de mensagens.",
        );
    }
    const account = await sqlOne(
      "UPDATE instagram_accounts SET ai_enabled=$2,updated_at=NOW() WHERE salon_id=$1 RETURNING id,username,ai_enabled,status",
      [auth.salonId, body.ai_enabled],
    );
    if (!account) throw new ApiError(404, "Conta não encontrada.");
    return NextResponse.json({ account });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE() {
  try {
    const auth = await requireSalon();
    if (!auth)
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (!["owner", "admin"].includes(auth.user.role))
      throw new ApiError(403, "Somente responsáveis podem desconectar canais.");
    await sql(
      "UPDATE instagram_accounts SET status='disconnected',ai_enabled=FALSE,updated_at=NOW() WHERE salon_id=$1",
      [auth.salonId],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

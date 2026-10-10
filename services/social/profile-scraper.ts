import { ApiError } from "@/lib/api-error";
import { sql, sqlOne, transaction } from "@/lib/db/neon";
import type { Owner } from "@/services/ai/owner-chat";
async function apify(path: string, init?: RequestInit) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token)
    throw new ApiError(
      503,
      "A coleta pública precisa ser habilitada pelo administrador com uma conta Apify.",
    );
  const res = await fetch(`https://api.apify.com/v2/${path}`, {
    ...init,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok)
    throw new ApiError(502, "Não foi possível acessar o coletor de perfis.");
  return res.json();
}
export function normalizeInstagramUsername(value: string) {
  const trimmed = value.trim();
  let name = trimmed.replace(/^@/, "");
  if (/^https?:/i.test(trimmed)) {
    const url = new URL(trimmed);
    if (!["instagram.com", "www.instagram.com"].includes(url.hostname))
      throw new ApiError(400, "Informe um perfil do Instagram.");
    name = url.pathname.split("/").filter(Boolean)[0] || "";
  }
  if (
    !/^[a-zA-Z0-9_.]{1,30}$/.test(name) ||
    ["p", "reel", "reels", "stories", "explore"].includes(name)
  )
    throw new ApiError(
      400,
      "Informe o @ do perfil da empresa, não uma publicação.",
    );
  return name.toLowerCase();
}
export async function startProfileScrape(owner: Owner) {
  if (!process.env.APIFY_API_TOKEN)
    throw new ApiError(
      503,
      "O administrador precisa configurar a coleta pública do Instagram.",
    );
  const salon = await sqlOne("SELECT instagram FROM salons WHERE id=$1", [
    owner.salonId,
  ]);
  const username = normalizeInstagramUsername(salon?.instagram || "");
  const job = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `scrape:${owner.salonId}`,
    ]);
    const recent = await client.query(
      "SELECT id FROM instagram_scrape_jobs WHERE salon_id=$1 AND created_at>NOW()-INTERVAL '15 minutes' LIMIT 1",
      [owner.salonId],
    );
    if (recent.rowCount)
      throw new ApiError(
        429,
        "Já existe uma coleta recente. Aguarde ou consulte o resultado.",
      );
    return (
      await client.query(
        "INSERT INTO instagram_scrape_jobs(salon_id,user_id,username) VALUES($1,$2,$3) RETURNING id",
        [owner.salonId, owner.userId, username],
      )
    ).rows[0];
  });
  try {
    const response = await apify(
      "acts/apify~instagram-profile-scraper/runs?timeout=120&maxItems=1",
      {
        method: "POST",
        body: JSON.stringify({
          usernames: [username],
          includeAboutSection: false,
        }),
      },
    );
    await sql(
      "UPDATE instagram_scrape_jobs SET provider_run_id=$2,status='running',updated_at=NOW() WHERE id=$1",
      [job.id, response.data.id],
    );
    return { id: job.id, status: "running" };
  } catch (e) {
    await sql(
      "UPDATE instagram_scrape_jobs SET status='failed',updated_at=NOW() WHERE id=$1",
      [job.id],
    );
    throw e;
  }
}
export async function pollProfileScrape(owner: Owner, id: string) {
  const job = await sqlOne(
    "SELECT * FROM instagram_scrape_jobs WHERE id=$1 AND salon_id=$2 AND user_id=$3",
    [id, owner.salonId, owner.userId],
  );
  if (!job) throw new ApiError(404, "Coleta não encontrada.");
  if (job.status !== "running") return { id: job.id, status: job.status };
  const run = (
    await apify(`actor-runs/${encodeURIComponent(job.provider_run_id)}`)
  ).data;
  if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
    await sql(
      "UPDATE instagram_scrape_jobs SET status='failed',updated_at=NOW() WHERE id=$1",
      [id],
    );
    return { id, status: "failed" };
  }
  if (run.status !== "SUCCEEDED") return { id, status: "running" };
  const rows = await apify(
    `datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&limit=1`,
  );
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (
    !profile ||
    profile.error ||
    profile.private ||
    String(profile.username || "").toLowerCase() !== job.username
  ) {
    await sql(
      "UPDATE instagram_scrape_jobs SET status='failed',updated_at=NOW() WHERE id=$1",
      [id],
    );
    throw new ApiError(
      422,
      "O perfil não retornou dados públicos suficientes.",
    );
  }
  const clean = {
    username: job.username,
    name: String(profile.fullName || "").slice(0, 500),
    biography: String(profile.biography || "").slice(0, 4000),
    website: profile.externalUrl || null,
    followers_count: profile.followersCount ?? null,
    media_count: profile.postsCount ?? null,
  };
  const posts = (Array.isArray(profile.latestPosts) ? profile.latestPosts : [])
    .slice(0, 12)
    .map((p: any) => ({
      caption: String(p.caption || "").slice(0, 3000),
      permalink: p.url,
      timestamp: p.timestamp,
      media_type: p.type,
      like_count: p.likesCount ?? null,
      comments_count: p.commentsCount ?? null,
    }));
  await transaction(async (client) => {
    const locked = await client.query(
      "SELECT id FROM instagram_scrape_jobs WHERE id=$1 AND salon_id=$2 AND user_id=$3 AND status='running' FOR UPDATE",
      [id, owner.salonId, owner.userId],
    );
    if (!locked.rowCount) return;
    const snapshot = await client.query(
      "INSERT INTO instagram_snapshots(salon_id,username,source,profile,posts) VALUES($1,$2,'apify_public_profile',$3::jsonb,$4::jsonb) RETURNING id",
      [
        owner.salonId,
        job.username,
        JSON.stringify(clean),
        JSON.stringify(posts),
      ],
    );
    await client.query(
      "UPDATE instagram_scrape_jobs SET status='completed',snapshot_id=$2,updated_at=NOW() WHERE id=$1",
      [id, snapshot.rows[0].id],
    );
  });
  return { id, status: "completed" };
}

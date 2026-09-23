import { ApiError } from "@/lib/api-error";
import { sql, sqlOne } from "@/lib/db/neon";
import { decryptSecret } from "@/services/admin/encryption-service";
export type InstagramAccount = {
  id: string;
  salon_id: string;
  instagram_user_id: string;
  username: string;
  access_token_encrypted: string;
  ai_enabled: boolean;
  status: string;
};
export async function instagramFetch(
  token: string,
  path: string,
  init?: RequestInit,
) {
  const version = process.env.META_GRAPH_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version))
    throw new ApiError(
      503,
      "Configure META_GRAPH_VERSION para conectar o Instagram.",
    );
  const res = await fetch(`https://graph.instagram.com/${version}/${path}`, {
    ...init,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new ApiError(
      res.status === 401 || res.status === 403 ? 422 : 502,
      "O Instagram recusou a solicitação. Confira o token, as permissões e a conta profissional.",
    );
  return data;
}
export function accountToken(account: InstagramAccount) {
  const token = decryptSecret(account.access_token_encrypted);
  if (!token) throw new ApiError(503, "Reconecte sua conta do Instagram.");
  return token;
}
export async function collectInstagram(salonId: string) {
  const account = await sqlOne<InstagramAccount>(
    "SELECT * FROM instagram_accounts WHERE salon_id=$1 AND status=$2",
    [salonId, "connected"],
  );
  if (!account)
    throw new ApiError(
      422,
      "Conecte a conta profissional do Instagram primeiro.",
    );
  const token = accountToken(account);
  const [profile, media] = await Promise.all([
    instagramFetch(
      token,
      `${account.instagram_user_id}?fields=id,username,name,followers_count,follows_count,media_count`,
    ),
    instagramFetch(
      token,
      `${account.instagram_user_id}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=25`,
    ),
  ]);
  const posts = Array.isArray(media.data)
    ? media.data
        .slice(0, 25)
        .map((post: any) => ({
          id: post.id,
          caption: String(post.caption || "").slice(0, 3000),
          media_type: post.media_type,
          permalink: post.permalink,
          timestamp: post.timestamp,
          like_count: post.like_count ?? null,
          comments_count: post.comments_count ?? null,
        }))
    : [];
  return sqlOne(
    "INSERT INTO instagram_snapshots(salon_id,username,source,profile,posts) VALUES($1,$2,$3,$4::jsonb,$5::jsonb) RETURNING id,username,source,profile,posts,collected_at",
    [
      salonId,
      account.username,
      "meta_instagram_api",
      JSON.stringify(profile),
      JSON.stringify(posts),
    ],
  );
}

// Only administrators can authorize destinations that receive provider credentials.
export function validateEvolutionUrl(
  value: string,
  trustedBase?: string | null,
) {
  const url = new URL(value);
  const configured = trustedBase || process.env.EVOLUTION_BASE_URL;
  const allowed = (process.env.EVOLUTION_ALLOWED_HOSTS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (!(configured && new URL(configured).origin === url.origin) &&
      !allowed.includes(url.host))
  )
    throw new Error("Evolution host is not authorized by the platform");
  return url.toString().replace(/\/+$/, "");
}

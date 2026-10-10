import crypto from "node:crypto";
export function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
export function validMetaSignature(
  raw: string,
  signature: string | null,
  secret: string | undefined,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature))
    return false;
  return safeEqual(
    signature,
    `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`,
  );
}

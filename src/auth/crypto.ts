import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function generateApiKeySecret(env: "live" | "test" = "live"): {
  secret: string;
  keyPrefix: string;
  keyHash: string;
} {
  const raw = randomBytes(24).toString("hex");
  const secret = `me_${env}_${raw}`;
  const keyPrefix = secret.slice(0, 12);
  return { secret, keyPrefix, keyHash: sha256(secret) };
}

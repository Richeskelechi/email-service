import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { ensureDefaultApiKeys } from "./api-keys";
import { safeEqual, sha256 } from "./crypto";
import type { AuthResult } from "./auth.types";

export async function authenticateApiKey(
  authorizationHeader: string | undefined,
): Promise<AuthResult> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "missing_bearer_token" };
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, status: 401, error: "empty_bearer_token" };
  }

  if (safeEqual(token, env.DEV_API_KEY)) {
    const org = await prisma.organization.upsert({
      where: { id: "local_dev_org" },
      create: { id: "local_dev_org", name: "Local Dev Org" },
      update: {},
    });

    await ensureDefaultApiKeys(org.id);

    const liveKey = await prisma.apiKey.findFirst({
      where: {
        organizationId: org.id,
        mode: "live",
        revokedAt: null,
      },
    });

    if (!liveKey) {
      return { ok: false, status: 500, error: "dev_live_key_missing" };
    }

    return {
      ok: true,
      auth: {
        organizationId: org.id,
        apiKeyId: liveKey.id,
        mode: "live",
      },
    };
  }

  const keyHash = sha256(token);
  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
  });

  if (!apiKey) {
    return { ok: false, status: 401, error: "invalid_api_key" };
  }

  return {
    ok: true,
    auth: {
      organizationId: apiKey.organizationId,
      apiKeyId: apiKey.id,
      mode: apiKey.mode,
    },
  };
}

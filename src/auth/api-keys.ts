import type { ApiKeyMode, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { generateApiKeySecret } from "./crypto";
import type { IssuedApiKey } from "./api-keys.types";

export type { IssuedApiKey } from "./api-keys.types";

type Tx = Prisma.TransactionClient;

async function insertApiKey(
  tx: Tx,
  input: {
    organizationId: string;
    name: string;
    mode: ApiKeyMode;
  },
): Promise<IssuedApiKey> {
  const { secret, keyPrefix, keyHash } = generateApiKeySecret(input.mode);

  const row = await tx.apiKey.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      mode: input.mode,
      keyPrefix,
      keyHash,
    },
  });

  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    keyPrefix: row.keyPrefix,
    secret,
    organizationId: row.organizationId,
  };
}

export async function createOrganization(input: {
  name: string;
  id?: string;
}): Promise<{
  organization: { id: string; name: string };
  testKey: IssuedApiKey;
  liveKey: IssuedApiKey;
}> {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        id: input.id,
        name: input.name,
      },
    });

    const testKey = await insertApiKey(tx, {
      organizationId: organization.id,
      name: "Test",
      mode: "test",
    });

    const liveKey = await insertApiKey(tx, {
      organizationId: organization.id,
      name: "Live",
      mode: "live",
    });

    return { organization, testKey, liveKey };
  });
}

export async function ensureDefaultApiKeys(organizationId: string): Promise<{
  testKey: IssuedApiKey | null;
  liveKey: IssuedApiKey | null;
}> {
  return prisma.$transaction(async (tx) => {
    const active = await tx.apiKey.findMany({
      where: { organizationId, revokedAt: null },
    });

    let testKey: IssuedApiKey | null = null;
    let liveKey: IssuedApiKey | null = null;

    if (!active.some((k) => k.mode === "test")) {
      testKey = await insertApiKey(tx, {
        organizationId,
        name: "Test",
        mode: "test",
      });
    }

    if (!active.some((k) => k.mode === "live")) {
      liveKey = await insertApiKey(tx, {
        organizationId,
        name: "Live",
        mode: "live",
      });
    }

    return { testKey, liveKey };
  });
}

export async function regenerateApiKey(input: {
  apiKeyId: string;
  organizationId: string;
}): Promise<IssuedApiKey> {
  const existing = await prisma.apiKey.findFirst({
    where: {
      id: input.apiKeyId,
      organizationId: input.organizationId,
      revokedAt: null,
    },
  });

  if (!existing) {
    throw new Error("api_key_not_found_or_revoked");
  }

  return prisma.$transaction(async (tx) => {
    const created = await insertApiKey(tx, {
      organizationId: existing.organizationId,
      name: existing.name,
      mode: existing.mode,
    });

    await tx.apiKey.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedById: created.id,
      },
    });

    return created;
  });
}

export async function revokeApiKey(input: {
  apiKeyId: string;
  organizationId: string;
}): Promise<void> {
  const result = await prisma.apiKey.updateMany({
    where: {
      id: input.apiKeyId,
      organizationId: input.organizationId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    throw new Error("api_key_not_found_or_revoked");
  }
}

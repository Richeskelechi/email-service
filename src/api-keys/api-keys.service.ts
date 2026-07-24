import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  insertApiKey,
  regenerateApiKey,
  revokeApiKey,
} from "../auth/api-keys";
import type { SessionUser } from "../auth/auth.types";
import {
  normalizePagination,
  paginatedResult,
  type PaginatedResult,
} from "../common/pagination";
import { prisma } from "../db/prisma";
import type {
  ApiKeyResponseDto,
  CreateApiKeyDto,
  IssuedApiKeyResponseDto,
  ListApiKeysQueryDto,
} from "./dto/api-key.dto";

const SECRET_WARNING =
  "Store this API key secret now. It is shown once and cannot be retrieved again — use regenerate to issue a new one.";

@Injectable()
export class ApiKeysService {
  async list(
    actor: SessionUser,
    query: ListApiKeysQueryDto,
  ): Promise<PaginatedResult<ApiKeyResponseDto>> {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.ApiKeyWhereInput = {
      organizationId: actor.organizationId,
    };

    if (!query.includeRevoked) {
      where.revokedAt = null;
    }

    if (query.mode) {
      where.mode = query.mode;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { keyPrefix: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        orderBy: { createdAt: query.sortOrder ?? "desc" },
        skip,
        take,
      }),
      prisma.apiKey.count({ where }),
    ]);

    return paginatedResult(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async create(
    actor: SessionUser,
    input: CreateApiKeyDto,
  ): Promise<IssuedApiKeyResponseDto> {
    const issued = await prisma.$transaction((tx) =>
      insertApiKey(tx, {
        organizationId: actor.organizationId,
        name: input.name.trim(),
        mode: input.mode,
      }),
    );

    return {
      id: issued.id,
      name: issued.name,
      mode: issued.mode,
      keyPrefix: issued.keyPrefix,
      revokedAt: null,
      replacedById: null,
      createdAt: new Date().toISOString(),
      secret: issued.secret,
      warning: SECRET_WARNING,
    };
  }

  async regenerate(
    actor: SessionUser,
    id: string,
  ): Promise<IssuedApiKeyResponseDto> {
    try {
      const issued = await regenerateApiKey({
        apiKeyId: id,
        organizationId: actor.organizationId,
      });

      return {
        id: issued.id,
        name: issued.name,
        mode: issued.mode,
        keyPrefix: issued.keyPrefix,
        revokedAt: null,
        replacedById: null,
        createdAt: new Date().toISOString(),
        secret: issued.secret,
        warning: SECRET_WARNING,
      };
    } catch (err) {
      if (err instanceof Error && err.message === "api_key_not_found_or_revoked") {
        throw new NotFoundException({ error: "api_key_not_found_or_revoked" });
      }
      throw err;
    }
  }

  async revoke(actor: SessionUser, id: string): Promise<{ ok: true }> {
    try {
      await revokeApiKey({
        apiKeyId: id,
        organizationId: actor.organizationId,
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof Error && err.message === "api_key_not_found_or_revoked") {
        throw new NotFoundException({ error: "api_key_not_found_or_revoked" });
      }
      throw err;
    }
  }

  private toResponse(row: {
    id: string;
    name: string;
    mode: "test" | "live";
    keyPrefix: string;
    revokedAt: Date | null;
    replacedById: string | null;
    createdAt: Date;
  }): ApiKeyResponseDto {
    return {
      id: row.id,
      name: row.name,
      mode: row.mode,
      keyPrefix: row.keyPrefix,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      replacedById: row.replacedById,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

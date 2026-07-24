import { Injectable, Logger } from "@nestjs/common";
import type { Permission, Prisma } from "@prisma/client";
import {
  normalizePagination,
  paginatedResult,
  type PaginatedResult,
} from "../common/pagination";
import { prisma } from "../db/prisma";
import { PERMISSIONS_CATALOG } from "./permissions.catalog";
import type { ListPermissionsQueryDto } from "./dto/list-permissions.dto";

type Tx = Prisma.TransactionClient;

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  async syncPermissions(): Promise<{
    added: number;
    updated: number;
    total: number;
    grantedToSuperAdmins: number;
  }> {
    const existing = await prisma.permission.findMany({
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((p) => p.key));

    const missing = PERMISSIONS_CATALOG.filter((p) => !existingKeys.has(p.key));
    const toUpdate = PERMISSIONS_CATALOG.filter((p) => existingKeys.has(p.key));

    if (missing.length > 0) {
      await prisma.permission.createMany({
        data: missing.map((p) => ({
          key: p.key,
          name: p.name,
          description: p.description,
        })),
        skipDuplicates: true,
      });
    }

    for (const def of toUpdate) {
      await prisma.permission.update({
        where: { key: def.key },
        data: {
          name: def.name,
          description: def.description,
        },
      });
    }

    const grantedToSuperAdmins = await this.grantAllToSuperAdminRoles();

    const result = {
      added: missing.length,
      updated: toUpdate.length,
      total: PERMISSIONS_CATALOG.length,
      grantedToSuperAdmins,
    };

    this.logger.log(
      `Permissions sync complete: catalog=${result.total}, added=${result.added}, updated=${result.updated}, superAdminGrants=${result.grantedToSuperAdmins}`,
    );
    console.log("[permissions] sync", result);

    return result;
  }

  async grantAllToSuperAdminRoles(): Promise<number> {
    const [permissionIds, superAdminRoles] = await Promise.all([
      prisma.permission.findMany({ select: { id: true } }),
      prisma.role.findMany({
        where: { isSuperAdmin: true },
        select: { id: true },
      }),
    ]);

    if (permissionIds.length === 0 || superAdminRoles.length === 0) {
      return 0;
    }

    const links = superAdminRoles.flatMap((role) =>
      permissionIds.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    );

    const result = await prisma.rolePermission.createMany({
      data: links,
      skipDuplicates: true,
    });

    return result.count;
  }

  async list(
    query: ListPermissionsQueryDto,
  ): Promise<PaginatedResult<Permission>> {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.PermissionWhereInput = {};

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { key: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy: { key: query.sortOrder === "desc" ? "desc" : "asc" },
        skip,
        take,
      }),
      prisma.permission.count({ where }),
    ]);

    return paginatedResult(rows, total, page, limit);
  }

  async listAll(): Promise<Permission[]> {
    return prisma.permission.findMany({
      orderBy: { key: "asc" },
    });
  }

  async getAllIds(tx: Tx | typeof prisma = prisma): Promise<string[]> {
    const rows = await tx.permission.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }
}

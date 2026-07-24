import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, Role } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import type { SessionUser } from "../auth/auth.types";
import {
  normalizePagination,
  paginatedResult,
  type PaginatedResult,
} from "../common/pagination";
import { prisma } from "../db/prisma";
import { SUPER_ADMIN_ROLE_NAME } from "../permissions/permissions.catalog";
import { PermissionsService } from "../permissions/permissions.service";
import type {
  CreateRoleDto,
  ListRolesQueryDto,
  RoleResponseDto,
  UpdateRoleDto,
} from "./dto/role.dto";

type Tx = Prisma.TransactionClient;

const roleInclude = {
  permissions: {
    include: {
      permission: {
        select: { id: true, key: true, name: true },
      },
    },
  },
  _count: { select: { users: true } },
} as const;

type RoleWithDetails = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

@Injectable()
export class RolesService {
  constructor(
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  async createSuperAdminRole(
    organizationId: string,
    tx: Tx = prisma as unknown as Tx,
  ): Promise<Role> {
    const role = await tx.role.create({
      data: {
        organizationId,
        name: SUPER_ADMIN_ROLE_NAME,
        isSuperAdmin: true,
      },
    });

    const permissionIds = await this.permissionsService.getAllIds(tx);
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return role;
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    tx: Tx = prisma as unknown as Tx,
  ): Promise<void> {
    await tx.userRole.create({
      data: { userId, roleId },
    });
  }

  async create(
    actor: SessionUser,
    input: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    const permissionIds = [...new Set(input.permissionIds)];
    await this.assertPermissionIds(permissionIds);

    try {
      const role = await prisma.$transaction(async (tx) => {
        const created = await tx.role.create({
          data: {
            organizationId: actor.organizationId,
            name: input.name.trim(),
            isSuperAdmin: false,
          },
        });

        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: created.id,
              permissionId,
            })),
          });
        }

        return tx.role.findUniqueOrThrow({
          where: { id: created.id },
          include: roleInclude,
        });
      });

      return this.toResponse(role);
    } catch (err) {
      if (
        err instanceof PrismaNS.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException({ error: "role_name_already_exists" });
      }
      throw err;
    }
  }

  async list(
    actor: SessionUser,
    query: ListRolesQueryDto,
  ): Promise<PaginatedResult<RoleResponseDto>> {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.RoleWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.search?.trim()) {
      where.name = { contains: query.search.trim(), mode: "insensitive" };
    }

    if (query.isSuperAdmin !== undefined) {
      where.isSuperAdmin = query.isSuperAdmin;
    }

    const [rows, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: roleInclude,
        orderBy: { createdAt: query.sortOrder ?? "desc" },
        skip,
        take,
      }),
      prisma.role.count({ where }),
    ]);

    return paginatedResult(
      rows.map((r) => this.toResponse(r)),
      total,
      page,
      limit,
    );
  }

  async getById(actor: SessionUser, id: string): Promise<RoleResponseDto> {
    const role = await this.findInOrgOrThrow(actor.organizationId, id);
    return this.toResponse(role);
  }

  async update(
    actor: SessionUser,
    id: string,
    input: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const existing = await this.findInOrgOrThrow(actor.organizationId, id);

    if (existing.isSuperAdmin) {
      if (input.name && input.name.trim() !== existing.name) {
        throw new BadRequestException({
          error: "cannot_rename_super_admin_role",
        });
      }
      // Super admin always keeps all permissions — ignore permissionIds changes
      // by re-syncing all permissions
      if (input.permissionIds) {
        const allIds = await this.permissionsService.getAllIds();
        await prisma.$transaction(async (tx) => {
          await tx.rolePermission.deleteMany({ where: { roleId: id } });
          if (allIds.length > 0) {
            await tx.rolePermission.createMany({
              data: allIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
            });
          }
        });
      }
      return this.getById(actor, id);
    }

    if (input.permissionIds) {
      const permissionIds = [...new Set(input.permissionIds)];
      await this.assertPermissionIds(permissionIds);

      try {
        await prisma.$transaction(async (tx) => {
          if (input.name) {
            await tx.role.update({
              where: { id },
              data: { name: input.name.trim() },
            });
          }
          await tx.rolePermission.deleteMany({ where: { roleId: id } });
          if (permissionIds.length > 0) {
            await tx.rolePermission.createMany({
              data: permissionIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
            });
          }
        });
      } catch (err) {
        if (
          err instanceof PrismaNS.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new ConflictException({ error: "role_name_already_exists" });
        }
        throw err;
      }
    } else if (input.name) {
      try {
        await prisma.role.update({
          where: { id },
          data: { name: input.name.trim() },
        });
      } catch (err) {
        if (
          err instanceof PrismaNS.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new ConflictException({ error: "role_name_already_exists" });
        }
        throw err;
      }
    }

    return this.getById(actor, id);
  }

  async remove(actor: SessionUser, id: string): Promise<{ ok: true }> {
    const role = await this.findInOrgOrThrow(actor.organizationId, id);
    if (role.isSuperAdmin) {
      throw new BadRequestException({ error: "cannot_delete_super_admin_role" });
    }

    if (role._count.users > 0) {
      throw new BadRequestException({
        error: "role_has_users",
        userCount: role._count.users,
      });
    }

    await prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  private async findInOrgOrThrow(
    organizationId: string,
    id: string,
  ): Promise<RoleWithDetails> {
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
      include: roleInclude,
    });
    if (!role) {
      throw new NotFoundException({ error: "role_not_found" });
    }
    return role;
  }

  private async assertPermissionIds(permissionIds: string[]): Promise<void> {
    if (permissionIds.length === 0) return;
    const found = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    if (found.length !== permissionIds.length) {
      throw new BadRequestException({ error: "invalid_permission_ids" });
    }
  }

  private toResponse(role: RoleWithDetails): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      isSuperAdmin: role.isSuperAdmin,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        key: rp.permission.key,
        name: rp.permission.name,
      })),
      userCount: role._count.users,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}

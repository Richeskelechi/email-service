import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import type { SessionUser } from "../auth/auth.types";
import {
  normalizePagination,
  paginatedResult,
  type PaginatedResult,
} from "../common/pagination";
import { prisma } from "../db/prisma";
import type { InviteUserDto, UpdateUserDto } from "./dto/user-input.dto";
import type { ListUsersQueryDto } from "./dto/user-response.dto";
import type {
  InviteUserResponseDto,
  UserResponseDto,
} from "./dto/user-response.dto";

const userInclude = {
  roles: {
    include: {
      role: {
        select: { id: true, name: true, isSuperAdmin: true },
      },
    },
  },
} as const;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async invite(
    actor: SessionUser,
    input: InviteUserDto,
  ): Promise<InviteUserResponseDto> {
    const roleIds = [...new Set(input.roleIds)];
    await this.assertRolesInOrg(actor.organizationId, roleIds);

    try {
      const { user, token, organizationName } = await prisma.$transaction(
        async (tx) => {
          const organization = await tx.organization.findUniqueOrThrow({
            where: { id: actor.organizationId },
          });

          const user = await tx.user.create({
            data: {
              organizationId: actor.organizationId,
              name: input.name,
              email: input.email.toLowerCase(),
              phone: input.phone,
              address: input.address,
            },
            include: userInclude,
          });

          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
          });

          const token = await this.authService.issuePasswordSetupToken(
            user.id,
            tx,
          );

          const full = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
            include: userInclude,
          });

          return {
            user: full,
            token,
            organizationName: organization.name,
          };
        },
      );

      let inviteEmailSent = false;
      try {
        await this.authService.sendPasswordSetupEmail({
          to: user.email,
          name: user.name,
          organizationName,
          token,
          purpose: "invite",
          inviterName: actor.name,
          inviterEmail: actor.email,
        });
        inviteEmailSent = true;
      } catch (err) {
        this.logger.error(
          `Failed to send invite email to ${user.email}`,
          err instanceof Error ? err.stack : String(err),
        );
      }

      return { ...this.toResponse(user), inviteEmailSent };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException({ error: "email_already_exists" });
      }
      throw err;
    }
  }

  async list(
    actor: SessionUser,
    query: ListUsersQueryDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.UserWhereInput = {
      organizationId: actor.organizationId,
    };

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    if (query.roleId) {
      where.roles = { some: { roleId: query.roleId } };
    }

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: query.sortOrder ?? "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return paginatedResult(
      rows.map((u) => this.toResponse(u)),
      total,
      page,
      limit,
    );
  }

  async getById(actor: SessionUser, id: string): Promise<UserResponseDto> {
    const user = await this.findInOrgOrThrow(actor.organizationId, id);
    return this.toResponse(user);
  }

  async update(
    actor: SessionUser,
    id: string,
    input: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const existing = await this.findInOrgOrThrow(actor.organizationId, id);

    if (input.roleIds) {
      const roleIds = [...new Set(input.roleIds)];
      await this.assertRolesInOrg(actor.organizationId, roleIds);
      await this.assertNotStrippingLastSuperAdmin(
        actor.organizationId,
        existing,
        roleIds,
      );

      await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
        await tx.user.update({
          where: { id },
          data: {
            name: input.name ?? undefined,
            phone: input.phone === undefined ? undefined : input.phone,
            address: input.address === undefined ? undefined : input.address,
          },
        });
      });
    } else {
      await prisma.user.update({
        where: { id },
        data: {
          name: input.name ?? undefined,
          phone: input.phone === undefined ? undefined : input.phone,
          address: input.address === undefined ? undefined : input.address,
        },
      });
    }

    return this.getById(actor, id);
  }

  async remove(actor: SessionUser, id: string): Promise<{ ok: true }> {
    if (actor.userId === id) {
      throw new BadRequestException({ error: "cannot_delete_yourself" });
    }

    const user = await this.findInOrgOrThrow(actor.organizationId, id);
    const isSuperAdmin = user.roles.some((ur) => ur.role.isSuperAdmin);
    if (isSuperAdmin) {
      const superAdminCount = await prisma.userRole.count({
        where: {
          role: {
            organizationId: actor.organizationId,
            isSuperAdmin: true,
          },
        },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException({
          error: "cannot_delete_last_super_admin",
        });
      }
    }

    await prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  async resendInvite(
    actor: SessionUser,
    id: string,
  ): Promise<InviteUserResponseDto> {
    const user = await this.findInOrgOrThrow(actor.organizationId, id);
    if (user.passwordHash) {
      throw new BadRequestException({ error: "user_already_has_password" });
    }

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
    });

    const token = await this.authService.issuePasswordSetupToken(user.id);
    let inviteEmailSent = false;
    try {
      await this.authService.sendPasswordSetupEmail({
        to: user.email,
        name: user.name,
        organizationName: organization.name,
        token,
        purpose: "invite",
        inviterName: actor.name,
        inviterEmail: actor.email,
      });
      inviteEmailSent = true;
    } catch (err) {
      this.logger.error(
        `Failed to resend invite email to ${user.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    const fresh = await this.findInOrgOrThrow(actor.organizationId, id);
    return { ...this.toResponse(fresh), inviteEmailSent };
  }

  private async findInOrgOrThrow(
    organizationId: string,
    id: string,
  ): Promise<UserWithRoles> {
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException({ error: "user_not_found" });
    }
    return user;
  }

  private async assertRolesInOrg(
    organizationId: string,
    roleIds: string[],
  ): Promise<void> {
    const roles = await prisma.role.findMany({
      where: { organizationId, id: { in: roleIds } },
      select: { id: true },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException({ error: "invalid_role_ids" });
    }
  }

  private async assertNotStrippingLastSuperAdmin(
    organizationId: string,
    user: UserWithRoles,
    nextRoleIds: string[],
  ): Promise<void> {
    const currentlySuper = user.roles.some((ur) => ur.role.isSuperAdmin);
    if (!currentlySuper) return;

    const nextRoles = await prisma.role.findMany({
      where: { id: { in: nextRoleIds }, organizationId },
      select: { isSuperAdmin: true },
    });
    const staysSuper = nextRoles.some((r) => r.isSuperAdmin);
    if (staysSuper) return;

    const superAdminCount = await prisma.userRole.count({
      where: {
        role: { organizationId, isSuperAdmin: true },
      },
    });
    if (superAdminCount <= 1) {
      throw new ForbiddenException({
        error: "cannot_remove_last_super_admin_role",
      });
    }
  }

  private toResponse(user: UserWithRoles): UserResponseDto {
    const invitePending =
      !user.passwordHash &&
      !!user.passwordSetupTokenHash &&
      !!user.passwordSetupTokenExpiresAt &&
      user.passwordSetupTokenExpiresAt > new Date();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      hasPassword: !!user.passwordHash,
      invitePending,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        isSuperAdmin: ur.role.isSuperAdmin,
      })),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

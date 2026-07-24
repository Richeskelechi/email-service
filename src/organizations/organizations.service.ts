import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { insertApiKey } from "../auth/api-keys";
import { prisma } from "../db/prisma";
import { RolesService } from "../roles/roles.service";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import type { OrganizationResponseDto } from "./dto/organization-response.dto";

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @Inject(RolesService) private readonly rolesService: RolesService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async create(input: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: input.name },
        });

        const user = await tx.user.create({
          data: {
            organizationId: organization.id,
            name: input.user.name,
            email: input.user.email.toLowerCase(),
            phone: input.user.phone,
            address: input.user.address,
          },
        });

        const role = await this.rolesService.createSuperAdminRole(
          organization.id,
          tx,
        );
        await this.rolesService.assignRoleToUser(user.id, role.id, tx);

        const setupToken = await this.authService.issuePasswordSetupToken(
          user.id,
          tx,
        );

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

        return { organization, user, role, testKey, liveKey, setupToken };
      });

      let passwordSetupEmailSent = false;
      try {
        await this.authService.sendPasswordSetupEmail({
          to: result.user.email,
          name: result.user.name,
          organizationName: result.organization.name,
          token: result.setupToken,
          purpose: "welcome",
        });
        passwordSetupEmailSent = true;
      } catch (err) {
        this.logger.error(
          `Failed to send password setup email to ${result.user.email}`,
          err instanceof Error ? err.stack : String(err),
        );
      }

      return {
        id: result.organization.id,
        name: result.organization.name,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          address: result.user.address,
        },
        role: {
          id: result.role.id,
          name: result.role.name,
          isSuperAdmin: result.role.isSuperAdmin,
        },
        apiKeys: {
          test: {
            id: result.testKey.id,
            name: result.testKey.name,
            mode: result.testKey.mode,
            keyPrefix: result.testKey.keyPrefix,
            secret: result.testKey.secret,
          },
          live: {
            id: result.liveKey.id,
            name: result.liveKey.name,
            mode: result.liveKey.mode,
            keyPrefix: result.liveKey.keyPrefix,
            secret: result.liveKey.secret,
          },
        },
        passwordSetupEmailSent,
        warning:
          "Store these API key secrets now. They are shown once and cannot be retrieved again — use regenerate to issue new ones.",
      };
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
}

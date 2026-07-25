import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { sendSmtp } from "../mail/smtp-client";
import { SYSTEM_TEMPLATE_KEYS } from "../templates/system-templates.catalog";
import { TemplatesService } from "../templates/templates.service";
import {
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./crypto";
import type {
  LoginResponseDto,
  MeResponseDto,
  SetPasswordResponseDto,
} from "./dto/auth-response.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ChangePasswordDto, ResetPasswordDto } from "./dto/password.dto";
import type { SetPasswordDto } from "./dto/set-password.dto";
import type { SessionUser } from "./auth.types";

type Tx = Prisma.TransactionClient;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => TemplatesService))
    private readonly templatesService: TemplatesService,
  ) {}

  async issuePasswordSetupToken(
    userId: string,
    tx: Tx | typeof prisma = prisma,
  ): Promise<string> {
    const rawToken = generateToken();
    const expiresAt = new Date(
      Date.now() + env.PASSWORD_SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    await tx.user.update({
      where: { id: userId },
      data: {
        passwordSetupTokenHash: hashToken(rawToken),
        passwordSetupTokenExpiresAt: expiresAt,
      },
    });

    return rawToken;
  }

  async sendPasswordSetupEmail(input: {
    to: string;
    name: string;
    organizationName: string;
    token: string;
    purpose?: "welcome" | "invite" | "reset";
    inviterName?: string;
    inviterEmail?: string;
  }): Promise<void> {
    const purpose = input.purpose ?? "welcome";
    const key =
      purpose === "reset"
        ? SYSTEM_TEMPLATE_KEYS.RESET_PASSWORD
        : purpose === "invite"
          ? SYSTEM_TEMPLATE_KEYS.INVITE_USER
          : SYSTEM_TEMPLATE_KEYS.SET_PASSWORD;

    const actionPath =
      purpose === "reset" ? "reset-password" : "set-password";
    const actionUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/${actionPath}?token=${encodeURIComponent(input.token)}`;

    const rendered = await this.templatesService.renderSystemTemplate(key, {
      name: input.name,
      organizationName: input.organizationName,
      actionUrl,
      expiresHours: env.PASSWORD_SETUP_TOKEN_TTL_HOURS,
      inviterName: input.inviterName ?? "",
      inviterEmail: input.inviterEmail ?? "",
    });

    console.log(
      JSON.stringify({
        event: "auth.email.sending",
        purpose,
        templateKey: key,
        to: input.to,
        organizationName: input.organizationName,
      }),
    );

    try {
      const messageId = await sendSmtp({
        from: env.MAIL_FROM_DEFAULT,
        to: input.to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      console.log(
        JSON.stringify({
          event: "auth.email.sent",
          purpose,
          templateKey: key,
          to: input.to,
          messageId,
        }),
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "auth.email.failed",
          purpose,
          templateKey: key,
          to: input.to,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      throw err;
    }
  }

  async setPassword(input: SetPasswordDto): Promise<SetPasswordResponseDto> {
    return this.applyPasswordToken(input.token, input.password);
  }

  /** Same token flow as set-password; used after forgot-password. */
  async resetPassword(input: ResetPasswordDto): Promise<SetPasswordResponseDto> {
    return this.applyPasswordToken(input.token, input.password);
  }

  async changePassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<SetPasswordResponseDto> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException({ error: "password_not_set" });
    }

    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ error: "invalid_current_password" });
    }

    if (input.currentPassword === input.newPassword) {
      throw new BadRequestException({ error: "password_unchanged" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: await hashPassword(input.newPassword) },
      });
      await tx.userSession.deleteMany({ where: { userId } });
    });

    return { ok: true };
  }

  private async applyPasswordToken(
    token: string,
    password: string,
  ): Promise<SetPasswordResponseDto> {
    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        passwordSetupTokenHash: tokenHash,
        passwordSetupTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException({ error: "invalid_or_expired_token" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(password),
          passwordSetupTokenHash: null,
          passwordSetupTokenExpiresAt: null,
        },
      });
      await tx.userSession.deleteMany({ where: { userId: user.id } });
    });

    return { ok: true };
  }

  async login(input: LoginDto): Promise<LoginResponseDto> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException({ error: "invalid_credentials" });
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ error: "invalid_credentials" });
    }

    const rawToken = generateToken();
    const expiresAt = new Date(
      Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    return {
      accessToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
      },
    };
  }

  async resolveSession(rawToken: string): Promise<SessionUser | null> {
    const session = await prisma.userSession.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }

    const isSuperAdmin = session.user.roles.some((ur) => ur.role.isSuperAdmin);
    const permissionKeys = [
      ...new Set(
        session.user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.key),
        ),
      ),
    ];

    return {
      sessionId: session.id,
      userId: session.user.id,
      organizationId: session.user.organizationId,
      email: session.user.email,
      name: session.user.name,
      isSuperAdmin,
      permissionKeys,
    };
  }

  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSuperAdmin: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({ error: "invalid_or_expired_session" });
    }

    const sessionUser = await this.loadPermissionSnapshot(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      organizationId: user.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      permissions: sessionUser.permissionKeys,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        isSuperAdmin: ur.role.isSuperAdmin,
      })),
    };
  }

  async logout(sessionId: string): Promise<{ ok: true }> {
    await prisma.userSession.deleteMany({ where: { id: sessionId } });
    return { ok: true };
  }

  /**
   * Always returns ok to avoid email enumeration.
   */
  async forgotPassword(input: ForgotPasswordDto): Promise<{ ok: true }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      return { ok: true };
    }

    try {
      const token = await this.issuePasswordSetupToken(user.id);
      await this.sendPasswordSetupEmail({
        to: user.email,
        name: user.name,
        organizationName: user.organization.name,
        token,
        purpose: "reset",
      });
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return { ok: true };
  }

  private async loadPermissionSnapshot(userId: string): Promise<{
    isSuperAdmin: boolean;
    permissionKeys: string[];
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return { isSuperAdmin: false, permissionKeys: [] };
    }

    return {
      isSuperAdmin: user.roles.some((ur) => ur.role.isSuperAdmin),
      permissionKeys: [
        ...new Set(
          user.roles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.key),
          ),
        ),
      ],
    };
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./require-permissions.decorator";
import type { SessionRequest } from "./session-auth.guard";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = request.sessionUser;

    if (!user) {
      throw new ForbiddenException({ error: "forbidden" });
    }

    if (user.isSuperAdmin) return true;

    const missing = required.filter((key) => !user.permissionKeys.includes(key));
    if (missing.length > 0) {
      throw new ForbiddenException({
        error: "insufficient_permissions",
        missing,
      });
    }

    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import type { SessionUser } from "./auth.types";

export type SessionRequest = Request & { sessionUser: SessionUser };

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new HttpException({ error: "missing_bearer_token" }, 401);
    }

    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      throw new HttpException({ error: "empty_bearer_token" }, 401);
    }

    const user = await this.authService.resolveSession(token);
    if (!user) {
      throw new HttpException({ error: "invalid_or_expired_session" }, 401);
    }

    request.sessionUser = user;
    return true;
  }
}

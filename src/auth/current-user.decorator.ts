import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { SessionUser } from "./auth.types";
import type { SessionRequest } from "./session-auth.guard";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest<SessionRequest>();
    return request.sessionUser;
  },
);

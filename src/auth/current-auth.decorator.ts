import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthContext } from "./auth.types";
import type { AuthedRequest } from "./api-key.guard";

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    return request.auth;
  },
);

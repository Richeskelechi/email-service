import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { authenticateApiKey } from "./authenticate";
import type { AuthContext } from "./auth.types";

export type AuthedRequest = Request & { auth: AuthContext };

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const result = await authenticateApiKey(request.headers.authorization);

    if (!result.ok) {
      throw new HttpException({ error: result.error }, result.status);
    }

    request.auth = result.auth;
    return true;
  }
}

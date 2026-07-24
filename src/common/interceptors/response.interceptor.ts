import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { Observable, map } from "rxjs";
import { apiResponse, isApiResponseBody } from "../api-response";
import { RESPONSE_MESSAGE_KEY } from "../decorators/response-message.decorator";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? "Success";

    return next.handle().pipe(
      map((data) => {
        if (isApiResponseBody(data)) return data;

        const res = context.switchToHttp().getResponse<Response>();
        return apiResponse(message, res.statusCode, data ?? null);
      }),
    );
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { apiResponse } from "../api-response";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, data } = normalizeException(exception, status);

    res.status(status).json(apiResponse(message, status, data));
  }
}

function normalizeException(
  exception: unknown,
  status: number,
): { message: string; data: unknown } {
  if (!(exception instanceof HttpException)) {
    return {
      message:
        status >= 500 ? "Internal server error" : "Request failed",
      data: null,
    };
  }

  const body = exception.getResponse();

  if (typeof body === "string") {
    return { message: body, data: null };
  }

  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;

    // Nest ValidationPipe: { statusCode, message: string[], error }
    if (Array.isArray(obj.message)) {
      return {
        message: "Validation failed",
        data: { errors: obj.message },
      };
    }

    if (typeof obj.error === "string" && typeof obj.message !== "string") {
      return {
        message: humanizeErrorCode(obj.error),
        data: stripHttpMeta(obj),
      };
    }

    if (typeof obj.message === "string") {
      const rest = stripHttpMeta(obj);
      if (!rest) return { message: obj.message, data: null };
      const dataKeys = Object.keys(rest).filter((k) => k !== "message");
      return {
        message: obj.message,
        data: dataKeys.length > 0 ? rest : null,
      };
    }

    if (typeof obj.error === "string") {
      return {
        message: humanizeErrorCode(obj.error),
        data: stripHttpMeta(obj),
      };
    }

    return {
      message: exception.message || "Request failed",
      data: stripHttpMeta(obj),
    };
  }

  return { message: exception.message || "Request failed", data: null };
}

function stripHttpMeta(obj: Record<string, unknown>): Record<string, unknown> | null {
  const { statusCode: _s, error: _e, message: _m, ...rest } = obj;
  // Keep `error` code in data when present (clients often key off it)
  const data: Record<string, unknown> = { ...rest };
  if (typeof obj.error === "string") data.error = obj.error;
  return Object.keys(data).length > 0 ? data : null;
}

function humanizeErrorCode(code: string): string {
  return code.replace(/_/g, " ");
}

import { ApiProperty } from "@nestjs/swagger";

export type ApiResponseBody<T = unknown> = {
  message: string;
  status: number;
  data: T;
};

export function apiResponse<T>(
  message: string,
  status: number,
  data: T,
): ApiResponseBody<T> {
  return { message, status, data };
}

export function isApiResponseBody(value: unknown): value is ApiResponseBody {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.message === "string" &&
    typeof v.status === "number" &&
    "data" in v
  );
}

/** Swagger shape for the standard envelope (data typed per endpoint). */
export class ApiResponseDto {
  @ApiProperty({ type: String, example: "Success" })
  message!: string;

  @ApiProperty({ type: Number, example: 200 })
  status!: number;

  @ApiProperty({ description: "Endpoint payload, or null on error" })
  data!: unknown;
}

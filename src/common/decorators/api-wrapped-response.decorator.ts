import { applyDecorators, type Type } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import { ApiResponseDto } from "../api-response";

type WrappedOptions = {
  status: number;
  type?: Type<unknown>;
  isArray?: boolean;
  description?: string;
};

/** Documents the standard { message, status, data } envelope in Swagger. */
export function ApiWrappedResponse(options: WrappedOptions) {
  const dataSchema = options.type
    ? options.isArray
      ? { type: "array" as const, items: { $ref: getSchemaPath(options.type) } }
      : { $ref: getSchemaPath(options.type) }
    : { nullable: true };

  const decorators = [
    ...(options.type ? [ApiExtraModels(ApiResponseDto, options.type)] : [ApiExtraModels(ApiResponseDto)]),
    ApiResponse({
      status: options.status,
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              status: { type: "number", example: options.status },
              data: dataSchema,
            },
          },
        ],
      },
    }),
  ];

  return applyDecorators(...decorators);
}

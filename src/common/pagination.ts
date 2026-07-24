import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    type: String,
    description: "Free-text search (endpoint-specific fields)",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}

export class PaginationMetaDto {
  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  totalPages!: number;
}

export type PaginatedResult<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function normalizePagination(query: {
  page?: number;
  limit?: number;
}): { page: number; limit: number; skip: number; take: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

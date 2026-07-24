import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import {
  PaginationMetaDto,
  PaginationQueryDto,
} from "../../common/pagination";

export class CreateTemplateDto {
  @ApiProperty({ type: String, example: "Welcome email" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    type: String,
    example: "Welcome to {{organizationName}}",
    description: "Supports {{variable}} placeholders",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subject!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  textBody?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  htmlBody?: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100_000)
  textBody?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200_000)
  htmlBody?: string | null;
}

export class ListTemplatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: "Include platform system templates (default false)",
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  })
  @IsBoolean()
  includeSystem?: boolean;
}

export class TemplateResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  key!: string | null;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  subject!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  textBody!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  htmlBody!: string | null;

  @ApiProperty({ type: Boolean })
  isSystem!: boolean;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;
}

export class PaginatedTemplatesResponseDto {
  @ApiProperty({ type: () => [TemplateResponseDto] })
  items!: TemplateResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}

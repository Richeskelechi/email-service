import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  PaginationMetaDto,
  PaginationQueryDto,
} from "../../common/pagination";

export class CreateApiKeyDto {
  @ApiProperty({ type: String, example: "Mobile app" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ["test", "live"], example: "test" })
  @IsIn(["test", "live"])
  mode!: "test" | "live";
}

export class ListApiKeysQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["test", "live"] })
  @IsOptional()
  @IsIn(["test", "live"])
  mode?: "test" | "live";

  @ApiPropertyOptional({
    type: Boolean,
    description: "Include revoked keys (default false)",
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
  includeRevoked?: boolean;
}

export class ApiKeyResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ enum: ["test", "live"] })
  mode!: "test" | "live";

  @ApiProperty({ type: String, example: "me_live_ab12" })
  keyPrefix!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  revokedAt!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  replacedById!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;
}

export class IssuedApiKeyResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    type: String,
    description: "Raw secret — shown only once",
  })
  secret!: string;

  @ApiProperty({ type: String })
  warning!: string;
}

export class PaginatedApiKeysResponseDto {
  @ApiProperty({ type: () => [ApiKeyResponseDto] })
  items!: ApiKeyResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}

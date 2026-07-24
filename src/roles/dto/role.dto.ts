import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  PaginationMetaDto,
  PaginationQueryDto,
} from "../../common/pagination";

export class CreateRoleDto {
  @ApiProperty({ type: String, example: "Developer" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    type: [String],
    description: "Permission ids to grant",
    example: [],
  })
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "Replace role permissions when provided",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class ListRolesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: "Filter by super-admin flag",
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  })
  @IsBoolean()
  isSuperAdmin?: boolean;
}

export class RolePermissionDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  key!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class RoleResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Boolean })
  isSuperAdmin!: boolean;

  @ApiProperty({ type: () => [RolePermissionDto] })
  permissions!: RolePermissionDto[];

  @ApiProperty({ type: Number })
  userCount!: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;
}

export class PaginatedRolesResponseDto {
  @ApiProperty({ type: () => [RoleResponseDto] })
  items!: RoleResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PaginationMetaDto,
  PaginationQueryDto,
} from "../../common/pagination";

export class ListPermissionsQueryDto extends PaginationQueryDto {}

export class PermissionItemDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, example: "templates:create" })
  key!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;
}

export class PaginatedPermissionsResponseDto {
  @ApiProperty({ type: () => [PermissionItemDto] })
  items!: PermissionItemDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}

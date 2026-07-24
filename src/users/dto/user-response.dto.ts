import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import {
  PaginationMetaDto,
  PaginationQueryDto,
} from "../../common/pagination";

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: "Filter users that have this role id",
  })
  @IsOptional()
  @IsString()
  roleId?: string;
}

export class UserRoleSummaryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Boolean })
  isSuperAdmin!: boolean;
}

export class UserResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  address!: string | null;

  @ApiProperty({ type: Boolean })
  hasPassword!: boolean;

  @ApiProperty({ type: Boolean })
  invitePending!: boolean;

  @ApiProperty({ type: () => [UserRoleSummaryDto] })
  roles!: UserRoleSummaryDto[];

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;
}

export class InviteUserResponseDto extends UserResponseDto {
  @ApiProperty({ type: Boolean })
  inviteEmailSent!: boolean;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: () => [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}

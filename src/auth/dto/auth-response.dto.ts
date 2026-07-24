import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuthUserDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: String })
  organizationId!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    type: String,
    description: "Opaque session token — send as Authorization: Bearer …",
  })
  accessToken!: string;

  @ApiProperty({ type: String, format: "date-time" })
  expiresAt!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;
}

export class SetPasswordResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  ok!: boolean;
}

export class MeRoleDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Boolean })
  isSuperAdmin!: boolean;
}

export class MeResponseDto {
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

  @ApiProperty({ type: String })
  organizationId!: string;

  @ApiProperty({ type: Boolean })
  isSuperAdmin!: boolean;

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty({ type: () => [MeRoleDto] })
  roles!: MeRoleDto[];
}

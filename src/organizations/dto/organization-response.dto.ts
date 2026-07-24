import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IssuedApiKeyDto {
  @ApiProperty({ type: String, example: "clx..." })
  id!: string;

  @ApiProperty({ type: String, example: "Test" })
  name!: string;

  @ApiProperty({ enum: ["test", "live"], example: "test" })
  mode!: "test" | "live";

  @ApiProperty({ type: String, example: "me_live_ab12" })
  keyPrefix!: string;

  @ApiProperty({
    type: String,
    description: "Raw secret — shown only once at create/regenerate",
  })
  secret!: string;
}

export class OrganizationApiKeysDto {
  @ApiProperty({ type: () => IssuedApiKeyDto })
  test!: IssuedApiKeyDto;

  @ApiProperty({ type: () => IssuedApiKeyDto })
  live!: IssuedApiKeyDto;
}

export class OrganizationUserResponseDto {
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
}

export class OrganizationRoleResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Boolean })
  isSuperAdmin!: boolean;
}

export class OrganizationResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: () => OrganizationUserResponseDto })
  user!: OrganizationUserResponseDto;

  @ApiProperty({ type: () => OrganizationRoleResponseDto })
  role!: OrganizationRoleResponseDto;

  @ApiProperty({ type: () => OrganizationApiKeysDto })
  apiKeys!: OrganizationApiKeysDto;

  @ApiProperty({
    type: Boolean,
    description:
      "Whether the set-password invite email was sent (check Mailpit locally)",
  })
  passwordSetupEmailSent!: boolean;

  @ApiProperty({ type: String })
  warning!: string;
}

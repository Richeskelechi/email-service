import { ApiProperty } from "@nestjs/swagger";

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

export class OrganizationResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: () => OrganizationApiKeysDto })
  apiKeys!: OrganizationApiKeysDto;

  @ApiProperty({ type: String })
  warning!: string;
}

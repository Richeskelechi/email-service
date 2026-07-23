import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateOrganizationDto {
  @ApiProperty({
    type: String,
    example: "Acme Inc",
    maxLength: 200,
    description: "Organization display name",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateOrganizationUserDto {
  @ApiProperty({ type: String, example: "Ada Lovelace" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ type: String, example: "ada@acme.com" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ type: String, example: "+2348012345678" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ type: String, example: "12 Marina, Lagos" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}

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

  @ApiProperty({ type: () => CreateOrganizationUserDto })
  @ValidateNested()
  @Type(() => CreateOrganizationUserDto)
  user!: CreateOrganizationUserDto;
}

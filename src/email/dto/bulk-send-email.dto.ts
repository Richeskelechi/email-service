import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class BulkRecipientDto {
  @ApiProperty({ type: String, example: "user@example.com" })
  @IsEmail()
  to!: string;

  @ApiPropertyOptional({
    type: String,
    description: "Override subject for this recipient",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(998)
  subject?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Override text body for this recipient",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  text?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Override HTML body for this recipient",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  html?: string;
}

export class BulkSendEmailDto {
  @ApiPropertyOptional({
    type: String,
    example: "noreply@example.com",
  })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiProperty({
    type: String,
    example: "Hello from Acme",
    description: "Default subject (can be overridden per recipient)",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(998)
  subject!: string;

  @ApiPropertyOptional({
    type: String,
    example: "Plain text body",
    description: "Default text body. Required if html is omitted.",
  })
  @ValidateIf((o: BulkSendEmailDto) => !o.html)
  @IsNotEmpty({ message: "Provide text and/or html body" })
  @IsString()
  @MaxLength(100_000)
  text?: string;

  @ApiPropertyOptional({
    type: String,
    example: "<p>HTML body</p>",
    description: "Default HTML body. Required if text is omitted.",
  })
  @ValidateIf((o: BulkSendEmailDto) => !o.text)
  @IsNotEmpty({ message: "Provide text and/or html body" })
  @IsString()
  @MaxLength(200_000)
  html?: string;

  @ApiProperty({
    type: [BulkRecipientDto],
    description: "Recipients (max controlled by BULK_MAX_RECIPIENTS)",
    example: [
      { to: "a@example.com" },
      { to: "b@example.com", subject: "Custom subject" },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => BulkRecipientDto)
  recipients!: BulkRecipientDto[];
}

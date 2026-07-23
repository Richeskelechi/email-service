import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class SendEmailDto {
  @ApiPropertyOptional({
    type: String,
    example: "noreply@example.com",
    description: "From address (defaults to platform default if omitted)",
  })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiProperty({
    type: String,
    example: "user@example.com",
  })
  @IsEmail()
  to!: string;

  @ApiProperty({
    type: String,
    example: "Hello",
    maxLength: 998,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(998)
  subject!: string;

  @ApiPropertyOptional({
    type: String,
    example: "Plain text body",
    description: "Plain-text body. Required if html is omitted.",
  })
  @ValidateIf((o: SendEmailDto) => !o.html)
  @IsNotEmpty({ message: "Provide text and/or html body" })
  @IsString()
  @MaxLength(100_000)
  text?: string;

  @ApiPropertyOptional({
    type: String,
    example: "<p>HTML body</p>",
    description: "HTML body. Required if text is omitted.",
  })
  @ValidateIf((o: SendEmailDto) => !o.text)
  @IsNotEmpty({ message: "Provide text and/or html body" })
  @IsString()
  @MaxLength(200_000)
  html?: string;
}

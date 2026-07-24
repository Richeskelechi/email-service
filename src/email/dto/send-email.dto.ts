import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class SendEmailDto {
  @ApiProperty({
    type: String,
    description: "Org template id to render and send",
    example: "clxtemplate...",
  })
  @IsString()
  @MinLength(1)
  templateId!: string;

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

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    example: { name: "Ada", organizationName: "Acme" },
    description: "Values for {{placeholders}} in the template",
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean>;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export class BulkRecipientDto {
  @ApiProperty({ type: String, example: "user@example.com" })
  @IsEmail()
  to!: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    description: "Per-recipient variables merged over the batch variables",
    example: { name: "Ada" },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean>;
}

export class BulkSendEmailDto {
  @ApiProperty({
    type: String,
    description: "Org template id to render for each recipient",
  })
  @IsString()
  @MinLength(1)
  templateId!: string;

  @ApiPropertyOptional({
    type: String,
    example: "noreply@citygroupsavings.com",
  })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    description: "Shared template variables for the batch",
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean>;

  @ApiProperty({
    type: [BulkRecipientDto],
    description: "Recipients (max controlled by BULK_MAX_RECIPIENTS)",
    example: [
      { to: "a@example.com", variables: { name: "Ada" } },
      { to: "b@example.com", variables: { name: "Grace" } },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => BulkRecipientDto)
  recipients!: BulkRecipientDto[];
}

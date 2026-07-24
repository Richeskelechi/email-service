import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ type: String, format: "email", example: "ada@acme.com" })
  @IsEmail()
  email!: string;
}

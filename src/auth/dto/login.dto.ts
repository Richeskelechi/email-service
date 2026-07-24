import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ type: String, format: "email", example: "ada@acme.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

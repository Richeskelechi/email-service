import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SetPasswordDto {
  @ApiProperty({
    type: String,
    description: "Raw token from the set-password email",
  })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ type: String, minLength: 8, example: "correct-horse-battery" })
  @IsString()
  @MinLength(8)
  password!: string;
}

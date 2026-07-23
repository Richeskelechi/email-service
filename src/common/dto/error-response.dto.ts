import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({ type: String, example: "validation_error" })
  error!: string;
}

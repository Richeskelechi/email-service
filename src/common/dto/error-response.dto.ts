import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** @deprecated Prefer ApiResponseDto — kept for any remaining imports during transition. */
export class ErrorResponseDto {
  @ApiProperty({ type: String, example: "Validation failed" })
  message!: string;

  @ApiProperty({ type: Number, example: 400 })
  status!: number;

  @ApiPropertyOptional({
    description: "Error details (e.g. validation errors or error code)",
    nullable: true,
  })
  data!: unknown;
}

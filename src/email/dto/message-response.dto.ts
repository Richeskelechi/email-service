import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AcceptEmailResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({
    enum: ["accepted", "sending", "sent", "simulated", "failed"],
    example: "accepted",
  })
  status!: "accepted" | "sending" | "sent" | "simulated" | "failed";

  @ApiProperty({ enum: ["test", "live"] })
  mode!: "test" | "live";
}

export class MessageResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({
    enum: ["accepted", "sending", "sent", "simulated", "failed"],
  })
  status!: "accepted" | "sending" | "sent" | "simulated" | "failed";

  @ApiProperty({ enum: ["test", "live"] })
  mode!: "test" | "live";

  @ApiProperty({ type: String })
  from!: string;

  @ApiProperty({ type: String })
  to!: string;

  @ApiProperty({ type: String })
  subject!: string;

  @ApiProperty({ type: Number })
  attempts!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  error!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  providerId!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  sentAt!: Date | null;
}

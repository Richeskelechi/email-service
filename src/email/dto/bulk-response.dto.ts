import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MessageResponseDto } from "./message-response.dto";

export class BulkAcceptResponseDto {
  @ApiProperty({ type: String })
  batchId!: string;

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ enum: ["test", "live"] })
  mode!: "test" | "live";

  @ApiProperty({
    enum: ["pending_fanout", "expanding", "ready"],
    description: "pending_fanout until the worker expands recipients into messages",
  })
  status!: "pending_fanout" | "expanding" | "ready";
}

export class BulkStatusCountsDto {
  @ApiProperty({ type: Number })
  accepted!: number;

  @ApiProperty({ type: Number })
  sending!: number;

  @ApiProperty({ type: Number })
  sent!: number;

  @ApiProperty({ type: Number })
  simulated!: number;

  @ApiProperty({ type: Number })
  failed!: number;
}

export class BulkStatusResponseDto {
  @ApiProperty({ type: String })
  batchId!: string;

  @ApiProperty({ enum: ["test", "live"] })
  mode!: "test" | "live";

  @ApiProperty({ enum: ["pending_fanout", "expanding", "ready"] })
  status!: "pending_fanout" | "expanding" | "ready";

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number, description: "Recipients expanded into message rows so far" })
  fannedOut!: number;

  @ApiProperty({ type: String })
  subject!: string;

  @ApiProperty({ type: () => BulkStatusCountsDto })
  counts!: BulkStatusCountsDto;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}

export class BulkMessagesQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 50, minimum: 1, maximum: 100 })
  limit?: number;
}

export class BulkMessagesResponseDto {
  @ApiProperty({ type: String })
  batchId!: string;

  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: [MessageResponseDto] })
  messages!: MessageResponseDto[];
}

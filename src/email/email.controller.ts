import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth.types";
import { ErrorResponseDto } from "../common/dto/error-response.dto";
import {
  BulkAcceptResponseDto,
  BulkMessagesResponseDto,
  BulkStatusResponseDto,
} from "./dto/bulk-response.dto";
import { BulkSendEmailDto } from "./dto/bulk-send-email.dto";
import {
  AcceptEmailResponseDto,
  MessageResponseDto,
} from "./dto/message-response.dto";
import { SendEmailDto } from "./dto/send-email.dto";
import { EmailService } from "./email.service";

@ApiTags("email")
@ApiBearerAuth("api-key")
@ApiSecurity("api-key")
@Controller("v1/email")
@UseGuards(ApiKeyGuard)
export class EmailController {
  constructor(
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  @Post("send")
  @HttpCode(202)
  @ApiOperation({
    summary: "Accept a single email for delivery",
    description:
      "test keys simulate only; live keys enqueue SMTP delivery via the worker.",
  })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({ status: 202, type: AcceptEmailResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 429, type: ErrorResponseDto })
  async send(
    @CurrentAuth() auth: AuthContext,
    @Body() body: SendEmailDto,
  ): Promise<AcceptEmailResponseDto> {
    return this.emailService.send(auth, body);
  }

  @Post("bulk")
  @HttpCode(202)
  @ApiOperation({
    summary: "Accept a bulk email batch",
    description:
      "Stores recipients and returns quickly. A worker fans out message rows, then delivers/simulates them.",
  })
  @ApiBody({ type: BulkSendEmailDto })
  @ApiResponse({ status: 202, type: BulkAcceptResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 429, type: ErrorResponseDto })
  async sendBulk(
    @CurrentAuth() auth: AuthContext,
    @Body() body: BulkSendEmailDto,
  ): Promise<BulkAcceptResponseDto> {
    return this.emailService.sendBulk(auth, body);
  }

  @Get("bulk/:batchId/messages")
  @ApiOperation({ summary: "List messages in a bulk batch (paginated)" })
  @ApiParam({ name: "batchId" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, type: BulkMessagesResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async listBulkMessages(
    @CurrentAuth() auth: AuthContext,
    @Param("batchId") batchId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<BulkMessagesResponseDto> {
    return this.emailService.listBulkMessages(
      auth,
      batchId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get("bulk/:batchId")
  @ApiOperation({ summary: "Get bulk batch status counts" })
  @ApiParam({ name: "batchId", description: "Batch id from POST /v1/email/bulk" })
  @ApiResponse({ status: 200, type: BulkStatusResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getBulk(
    @CurrentAuth() auth: AuthContext,
    @Param("batchId") batchId: string,
  ): Promise<BulkStatusResponseDto> {
    return this.emailService.getBulkStatus(auth, batchId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get message status by id" })
  @ApiParam({ name: "id", description: "Message id" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async getOne(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
  ): Promise<MessageResponseDto> {
    return this.emailService.getById(auth, id);
  }
}

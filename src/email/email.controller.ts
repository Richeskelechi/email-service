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
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth.types";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import {
  BulkAcceptResponseDto,
  BulkMessagesQueryDto,
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
  @ResponseMessage("Email accepted")
  @ApiOperation({
    summary: "Accept a single email for delivery",
    description:
      "Requires an org templateId. Renders {{variables}} then queues. test keys simulate only; live keys SMTP via the worker.",
  })
  @ApiBody({ type: SendEmailDto })
  @ApiWrappedResponse({ status: 202, type: AcceptEmailResponseDto })
  @ApiWrappedResponse({ status: 400 })
  @ApiWrappedResponse({ status: 401 })
  @ApiWrappedResponse({ status: 429 })
  async send(
    @CurrentAuth() auth: AuthContext,
    @Body() body: SendEmailDto,
  ): Promise<AcceptEmailResponseDto> {
    return this.emailService.send(auth, body);
  }

  @Post("bulk")
  @HttpCode(202)
  @ResponseMessage("Bulk email accepted")
  @ApiOperation({
    summary: "Accept a bulk email batch",
    description:
      "Requires an org templateId. Renders per recipient (batch variables + recipient variables), then fans out via the worker.",
  })
  @ApiBody({ type: BulkSendEmailDto })
  @ApiWrappedResponse({ status: 202, type: BulkAcceptResponseDto })
  @ApiWrappedResponse({ status: 400 })
  @ApiWrappedResponse({ status: 401 })
  @ApiWrappedResponse({ status: 429 })
  async sendBulk(
    @CurrentAuth() auth: AuthContext,
    @Body() body: BulkSendEmailDto,
  ): Promise<BulkAcceptResponseDto> {
    return this.emailService.sendBulk(auth, body);
  }

  @Get("bulk/:batchId/messages")
  @ResponseMessage("Bulk messages retrieved successfully")
  @ApiOperation({ summary: "List messages in a bulk batch (paginated + filters)" })
  @ApiParam({ name: "batchId" })
  @ApiWrappedResponse({ status: 200, type: BulkMessagesResponseDto })
  @ApiWrappedResponse({ status: 401 })
  @ApiWrappedResponse({ status: 404 })
  async listBulkMessages(
    @CurrentAuth() auth: AuthContext,
    @Param("batchId") batchId: string,
    @Query() query: BulkMessagesQueryDto,
  ): Promise<BulkMessagesResponseDto> {
    return this.emailService.listBulkMessages(auth, batchId, query);
  }

  @Get("bulk/:batchId")
  @ResponseMessage("Bulk status retrieved successfully")
  @ApiOperation({ summary: "Get bulk batch status counts" })
  @ApiParam({ name: "batchId", description: "Batch id from POST /v1/email/bulk" })
  @ApiWrappedResponse({ status: 200, type: BulkStatusResponseDto })
  @ApiWrappedResponse({ status: 401 })
  @ApiWrappedResponse({ status: 404 })
  async getBulk(
    @CurrentAuth() auth: AuthContext,
    @Param("batchId") batchId: string,
  ): Promise<BulkStatusResponseDto> {
    return this.emailService.getBulkStatus(auth, batchId);
  }

  @Get(":id")
  @ResponseMessage("Message retrieved successfully")
  @ApiOperation({ summary: "Get message status by id" })
  @ApiParam({ name: "id", description: "Message id" })
  @ApiWrappedResponse({ status: 200, type: MessageResponseDto })
  @ApiWrappedResponse({ status: 401 })
  @ApiWrappedResponse({ status: 404 })
  async getOne(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
  ): Promise<MessageResponseDto> {
    return this.emailService.getById(auth, id);
  }
}

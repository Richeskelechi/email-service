import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import type { AuthContext } from "../auth/auth.types";
import type { SendEmailDto } from "./dto/send-email.dto";
import type { BulkSendEmailDto } from "./dto/bulk-send-email.dto";
import type {
  AcceptEmailResponseDto,
  MessageResponseDto,
} from "./dto/message-response.dto";
import type {
  BulkAcceptResponseDto,
  BulkMessagesResponseDto,
  BulkStatusResponseDto,
} from "./dto/bulk-response.dto";
import { assertOrgSendQuota } from "./rate-limit";
import {
  normalizePagination,
  paginatedResult,
} from "../common/pagination";
import type { MessageStatus } from "@prisma/client";
import { TemplatesService } from "../templates/templates.service";

@Injectable()
export class EmailService {
  constructor(
    @Inject(TemplatesService)
    private readonly templatesService: TemplatesService,
  ) {}

  async send(
    auth: AuthContext,
    input: SendEmailDto,
  ): Promise<AcceptEmailResponseDto> {
    await assertOrgSendQuota(auth.organizationId, 1);

    const rendered = await this.templatesService.renderOrgTemplate(
      auth.organizationId,
      input.templateId,
      input.variables ?? {},
    );

    const message = await prisma.message.create({
      data: {
        organizationId: auth.organizationId,
        apiKeyId: auth.apiKeyId,
        mode: auth.mode,
        status: "accepted",
        fromEmail: input.from ?? env.MAIL_FROM_DEFAULT,
        toEmail: input.to,
        subject: rendered.subject,
        textBody: rendered.text,
        htmlBody: rendered.html,
      },
    });

    return {
      id: message.id,
      status: message.status,
      mode: message.mode,
    };
  }

  async sendBulk(
    auth: AuthContext,
    input: BulkSendEmailDto,
  ): Promise<BulkAcceptResponseDto> {
    if (input.recipients.length > env.BULK_MAX_RECIPIENTS) {
      throw new BadRequestException({
        error: "too_many_recipients",
        max: env.BULK_MAX_RECIPIENTS,
        received: input.recipients.length,
      });
    }

    await assertOrgSendQuota(auth.organizationId, input.recipients.length);

    const baseVariables = input.variables ?? {};
    const storedRecipients: Array<{
      to: string;
      subject: string;
      text?: string;
      html?: string;
    }> = [];

    let batchSubject = "";
    let batchText: string | undefined;
    let batchHtml: string | undefined;

    for (const recipient of input.recipients) {
      const rendered = await this.templatesService.renderOrgTemplate(
        auth.organizationId,
        input.templateId,
        { ...baseVariables, ...(recipient.variables ?? {}) },
      );

      if (!batchSubject) {
        batchSubject = rendered.subject;
        batchText = rendered.text;
        batchHtml = rendered.html;
      }

      storedRecipients.push({
        to: recipient.to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
    }

    const batch = await prisma.emailBatch.create({
      data: {
        organizationId: auth.organizationId,
        apiKeyId: auth.apiKeyId,
        mode: auth.mode,
        status: "pending_fanout",
        total: input.recipients.length,
        fannedOut: 0,
        subject: batchSubject,
        fromEmail: input.from ?? env.MAIL_FROM_DEFAULT,
        textBody: batchText,
        htmlBody: batchHtml,
        recipients: storedRecipients as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      batchId: batch.id,
      total: batch.total,
      mode: batch.mode,
      status: batch.status,
    };
  }

  async getBulkStatus(
    auth: AuthContext,
    batchId: string,
  ): Promise<BulkStatusResponseDto> {
    const batch = await prisma.emailBatch.findFirst({
      where: {
        id: batchId,
        organizationId: auth.organizationId,
      },
    });

    if (!batch) {
      throw new NotFoundException({ error: "batch_not_found" });
    }

    const grouped = await prisma.message.groupBy({
      by: ["status"],
      where: { batchId },
      _count: { _all: true },
    });

    const counts = {
      accepted: 0,
      sending: 0,
      sent: 0,
      simulated: 0,
      failed: 0,
    };

    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }

    return {
      batchId: batch.id,
      mode: batch.mode,
      status: batch.status,
      total: batch.total,
      fannedOut: batch.fannedOut,
      subject: batch.subject,
      counts,
      createdAt: batch.createdAt,
    };
  }

  async listBulkMessages(
    auth: AuthContext,
    batchId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: MessageStatus;
      sortOrder?: "asc" | "desc";
    },
  ): Promise<BulkMessagesResponseDto> {
    const { page, limit, skip, take } = normalizePagination(query);

    const batch = await prisma.emailBatch.findFirst({
      where: {
        id: batchId,
        organizationId: auth.organizationId,
      },
      select: { id: true },
    });

    if (!batch) {
      throw new NotFoundException({ error: "batch_not_found" });
    }

    const where: Prisma.MessageWhereInput = {
      batchId,
      organizationId: auth.organizationId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { toEmail: { contains: q, mode: "insensitive" } },
        { fromEmail: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.findMany({
        where,
        orderBy: { createdAt: query.sortOrder ?? "asc" },
        skip,
        take,
      }),
    ]);

    const pageResult = paginatedResult(
      rows.map((message) => ({
        id: message.id,
        status: message.status,
        mode: message.mode,
        from: message.fromEmail,
        to: message.toEmail,
        subject: message.subject,
        attempts: message.attempts,
        error: message.errorMessage,
        providerId: message.providerId,
        createdAt: message.createdAt,
        sentAt: message.sentAt,
      })),
      total,
      page,
      limit,
    );

    return {
      batchId,
      items: pageResult.items,
      meta: pageResult.meta,
    };
  }

  async getById(auth: AuthContext, id: string): Promise<MessageResponseDto> {
    const message = await prisma.message.findFirst({
      where: {
        id,
        organizationId: auth.organizationId,
      },
    });

    if (!message) {
      throw new NotFoundException({ error: "not_found" });
    }

    return {
      id: message.id,
      status: message.status,
      mode: message.mode,
      from: message.fromEmail,
      to: message.toEmail,
      subject: message.subject,
      attempts: message.attempts,
      error: message.errorMessage,
      providerId: message.providerId,
      createdAt: message.createdAt,
      sentAt: message.sentAt,
    };
  }
}

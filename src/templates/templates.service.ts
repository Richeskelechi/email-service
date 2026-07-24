import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { SessionUser } from "../auth/auth.types";
import {
  normalizePagination,
  paginatedResult,
  type PaginatedResult,
} from "../common/pagination";
import { prisma } from "../db/prisma";
import type {
  CreateTemplateDto,
  ListTemplatesQueryDto,
  TemplateResponseDto,
  UpdateTemplateDto,
} from "./dto/template.dto";
import { SYSTEM_TEMPLATES_CATALOG } from "./system-templates.catalog";
import {
  renderTemplateContent,
  type RenderedTemplate,
  type TemplateVariables,
} from "./template-render";

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  async syncSystemTemplates(): Promise<{ upserted: number }> {
    let upserted = 0;

    for (const def of SYSTEM_TEMPLATES_CATALOG) {
      await prisma.emailTemplate.upsert({
        where: { key: def.key },
        create: {
          key: def.key,
          name: def.name,
          subject: def.subject,
          textBody: def.textBody,
          htmlBody: def.htmlBody,
          isSystem: true,
          organizationId: null,
        },
        update: {
          name: def.name,
          subject: def.subject,
          textBody: def.textBody,
          htmlBody: def.htmlBody,
          isSystem: true,
          organizationId: null,
        },
      });
      upserted += 1;
    }

    this.logger.log(`System templates sync complete: upserted=${upserted}`);
    console.log("[templates] system sync", { upserted });
    return { upserted };
  }

  async create(
    actor: SessionUser,
    input: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    this.assertHasBody(input.textBody, input.htmlBody);

    try {
      const row = await prisma.emailTemplate.create({
        data: {
          organizationId: actor.organizationId,
          name: input.name.trim(),
          subject: input.subject,
          textBody: input.textBody,
          htmlBody: input.htmlBody,
          isSystem: false,
        },
      });
      return this.toResponse(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException({ error: "template_name_already_exists" });
      }
      throw err;
    }
  }

  async list(
    actor: SessionUser,
    query: ListTemplatesQueryDto,
  ): Promise<PaginatedResult<TemplateResponseDto>> {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.EmailTemplateWhereInput = query.includeSystem
      ? {
          OR: [
            { organizationId: actor.organizationId, isSystem: false },
            { isSystem: true },
          ],
        }
      : { organizationId: actor.organizationId, isSystem: false };

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
            { key: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        orderBy: { createdAt: query.sortOrder ?? "desc" },
        skip,
        take,
      }),
      prisma.emailTemplate.count({ where }),
    ]);

    return paginatedResult(
      rows.map((r) => this.toResponse(r)),
      total,
      page,
      limit,
    );
  }

  async getById(actor: SessionUser, id: string): Promise<TemplateResponseDto> {
    const row = await this.findReadableOrThrow(actor.organizationId, id);
    return this.toResponse(row);
  }

  async update(
    actor: SessionUser,
    id: string,
    input: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const existing = await this.findInOrgOrThrow(actor.organizationId, id);
    if (existing.isSystem) {
      throw new ForbiddenException({ error: "cannot_modify_system_template" });
    }

    const nextText =
      input.textBody === undefined ? existing.textBody : input.textBody;
    const nextHtml =
      input.htmlBody === undefined ? existing.htmlBody : input.htmlBody;
    this.assertHasBody(nextText, nextHtml);

    try {
      const row = await prisma.emailTemplate.update({
        where: { id },
        data: {
          name: input.name?.trim(),
          subject: input.subject,
          textBody: input.textBody === undefined ? undefined : input.textBody,
          htmlBody: input.htmlBody === undefined ? undefined : input.htmlBody,
        },
      });
      return this.toResponse(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException({ error: "template_name_already_exists" });
      }
      throw err;
    }
  }

  async remove(actor: SessionUser, id: string): Promise<{ ok: true }> {
    const existing = await this.findInOrgOrThrow(actor.organizationId, id);
    if (existing.isSystem) {
      throw new ForbiddenException({ error: "cannot_delete_system_template" });
    }
    await prisma.emailTemplate.delete({ where: { id } });
    return { ok: true };
  }

  /** Resolve an org-owned template and render with variables. */
  async renderOrgTemplate(
    organizationId: string,
    templateId: string,
    variables: TemplateVariables = {},
  ): Promise<RenderedTemplate & { templateId: string }> {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        organizationId,
        isSystem: false,
      },
    });

    if (!template) {
      throw new NotFoundException({ error: "template_not_found" });
    }

    this.assertHasBody(template.textBody, template.htmlBody);
    const rendered = renderTemplateContent(template, variables);
    return { ...rendered, templateId: template.id };
  }

  async renderSystemTemplate(
    key: string,
    variables: TemplateVariables = {},
  ): Promise<RenderedTemplate> {
    const template = await prisma.emailTemplate.findUnique({
      where: { key },
    });

    if (!template || !template.isSystem) {
      throw new NotFoundException({ error: "system_template_not_found", key });
    }

    return renderTemplateContent(template, variables);
  }

  private async findInOrgOrThrow(organizationId: string, id: string) {
    const row = await prisma.emailTemplate.findFirst({
      where: { id, organizationId, isSystem: false },
    });
    if (!row) {
      throw new NotFoundException({ error: "template_not_found" });
    }
    return row;
  }

  private async findReadableOrThrow(organizationId: string, id: string) {
    const row = await prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { organizationId, isSystem: false },
          { isSystem: true },
        ],
      },
    });
    if (!row) {
      throw new NotFoundException({ error: "template_not_found" });
    }
    return row;
  }

  private assertHasBody(
    textBody: string | null | undefined,
    htmlBody: string | null | undefined,
  ): void {
    const hasText = typeof textBody === "string" && textBody.trim().length > 0;
    const hasHtml = typeof htmlBody === "string" && htmlBody.trim().length > 0;
    if (!hasText && !hasHtml) {
      throw new BadRequestException({ error: "text_or_html_required" });
    }
  }

  private toResponse(row: {
    id: string;
    key: string | null;
    name: string;
    subject: string;
    textBody: string | null;
    htmlBody: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): TemplateResponseDto {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      subject: row.subject,
      textBody: row.textBody,
      htmlBody: row.htmlBody,
      isSystem: row.isSystem,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

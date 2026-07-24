import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
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
import type { SessionUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import {
  CreateTemplateDto,
  ListTemplatesQueryDto,
  PaginatedTemplatesResponseDto,
  TemplateResponseDto,
  UpdateTemplateDto,
} from "./dto/template.dto";
import { TemplatesService } from "./templates.service";

@ApiTags("templates")
@ApiBearerAuth("session")
@ApiSecurity("session")
@UseGuards(SessionAuthGuard, PermissionsGuard)
@Controller("v1/templates")
export class TemplatesController {
  constructor(
    @Inject(TemplatesService)
    private readonly templatesService: TemplatesService,
  ) {}

  @Post()
  @HttpCode(201)
  @RequirePermissions("templates:create")
  @ResponseMessage("Template created successfully")
  @ApiOperation({ summary: "Create an email template" })
  @ApiBody({ type: CreateTemplateDto })
  @ApiWrappedResponse({ status: 201, type: TemplateResponseDto })
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.create(user, body);
  }

  @Get()
  @RequirePermissions("templates:read")
  @ResponseMessage("Templates retrieved successfully")
  @ApiOperation({ summary: "List templates (paginated + search)" })
  @ApiWrappedResponse({ status: 200, type: PaginatedTemplatesResponseDto })
  list(
    @CurrentUser() user: SessionUser,
    @Query() query: ListTemplatesQueryDto,
  ) {
    return this.templatesService.list(user, query);
  }

  @Get(":id")
  @RequirePermissions("templates:read")
  @ResponseMessage("Template retrieved successfully")
  @ApiOperation({ summary: "Get a template by id" })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200, type: TemplateResponseDto })
  getOne(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.getById(user, id);
  }

  @Patch(":id")
  @RequirePermissions("templates:update")
  @ResponseMessage("Template updated successfully")
  @ApiOperation({ summary: "Update a template" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiWrappedResponse({ status: 200, type: TemplateResponseDto })
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.update(user, id, body);
  }

  @Delete(":id")
  @HttpCode(200)
  @RequirePermissions("templates:delete")
  @ResponseMessage("Template deleted successfully")
  @ApiOperation({ summary: "Delete a template" })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200 })
  remove(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<{ ok: true }> {
    return this.templatesService.remove(user, id);
  }
}

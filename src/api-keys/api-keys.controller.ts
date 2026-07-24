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
import type { SessionUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { ApiKeysService } from "./api-keys.service";
import {
  CreateApiKeyDto,
  IssuedApiKeyResponseDto,
  ListApiKeysQueryDto,
  PaginatedApiKeysResponseDto,
} from "./dto/api-key.dto";

@ApiTags("api-keys")
@ApiBearerAuth("session")
@ApiSecurity("session")
@UseGuards(SessionAuthGuard, PermissionsGuard)
@Controller("v1/api-keys")
export class ApiKeysController {
  constructor(
    @Inject(ApiKeysService) private readonly apiKeysService: ApiKeysService,
  ) {}

  @Get()
  @RequirePermissions("api_keys:read")
  @ResponseMessage("API keys retrieved successfully")
  @ApiOperation({
    summary: "List API keys",
    description:
      "Secrets are never listed — only prefix/metadata. Use regenerate or create to obtain a secret.",
  })
  @ApiWrappedResponse({ status: 200, type: PaginatedApiKeysResponseDto })
  list(
    @CurrentUser() user: SessionUser,
    @Query() query: ListApiKeysQueryDto,
  ) {
    return this.apiKeysService.list(user, query);
  }

  @Post()
  @HttpCode(201)
  @RequirePermissions("api_keys:create")
  @ResponseMessage("API key created successfully")
  @ApiOperation({
    summary: "Create an additional API key",
    description:
      "Use this to add another named key (e.g. a second app). To rotate an existing key’s secret, use regenerate instead.",
  })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiWrappedResponse({ status: 201, type: IssuedApiKeyResponseDto })
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: CreateApiKeyDto,
  ): Promise<IssuedApiKeyResponseDto> {
    return this.apiKeysService.create(user, body);
  }

  @Post(":id/regenerate")
  @HttpCode(200)
  @RequirePermissions("api_keys:regenerate")
  @ResponseMessage("API key regenerated successfully")
  @ApiOperation({
    summary: "Regenerate (rotate) an API key",
    description:
      "Revokes the old key and issues a new secret with the same name and mode. Prefer this over create when rotating.",
  })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200, type: IssuedApiKeyResponseDto })
  regenerate(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<IssuedApiKeyResponseDto> {
    return this.apiKeysService.regenerate(user, id);
  }

  @Post(":id/revoke")
  @HttpCode(200)
  @RequirePermissions("api_keys:revoke")
  @ResponseMessage("API key revoked successfully")
  @ApiOperation({
    summary: "Revoke an API key",
    description: "Disables the key with no replacement. Create a new one if you need another secret.",
  })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200 })
  revoke(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<{ ok: true }> {
    return this.apiKeysService.revoke(user, id);
  }
}

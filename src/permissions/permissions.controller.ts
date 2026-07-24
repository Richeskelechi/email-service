import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import {
  ListPermissionsQueryDto,
  PaginatedPermissionsResponseDto,
} from "./dto/list-permissions.dto";
import { PermissionsService } from "./permissions.service";

@ApiTags("permissions")
@Controller("v1/permissions")
export class PermissionsController {
  constructor(
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @ResponseMessage("Permissions retrieved successfully")
  @ApiOperation({ summary: "List system permissions (paginated + search)" })
  @ApiWrappedResponse({ status: 200, type: PaginatedPermissionsResponseDto })
  async list(@Query() query: ListPermissionsQueryDto) {
    const result = await this.permissionsService.list(query);
    return {
      items: result.items.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
      })),
      meta: result.meta,
    };
  }
}

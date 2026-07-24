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
import { CurrentUser } from "../auth/current-user.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import type { SessionUser } from "../auth/auth.types";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import {
  CreateRoleDto,
  ListRolesQueryDto,
  PaginatedRolesResponseDto,
  RoleResponseDto,
  UpdateRoleDto,
} from "./dto/role.dto";
import { RolesService } from "./roles.service";

@ApiTags("roles")
@ApiBearerAuth("session")
@ApiSecurity("session")
@UseGuards(SessionAuthGuard, PermissionsGuard)
@Controller("v1/roles")
export class RolesController {
  constructor(@Inject(RolesService) private readonly rolesService: RolesService) {}

  @Post()
  @HttpCode(201)
  @RequirePermissions("roles:create")
  @ResponseMessage("Role created successfully")
  @ApiOperation({ summary: "Create a custom role" })
  @ApiBody({ type: CreateRoleDto })
  @ApiWrappedResponse({ status: 201, type: RoleResponseDto })
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.create(user, body);
  }

  @Get()
  @RequirePermissions("roles:read")
  @ResponseMessage("Roles retrieved successfully")
  @ApiOperation({ summary: "List roles (paginated + filters)" })
  @ApiWrappedResponse({ status: 200, type: PaginatedRolesResponseDto })
  list(
    @CurrentUser() user: SessionUser,
    @Query() query: ListRolesQueryDto,
  ) {
    return this.rolesService.list(user, query);
  }

  @Get(":id")
  @RequirePermissions("roles:read")
  @ResponseMessage("Role retrieved successfully")
  @ApiOperation({ summary: "Get a role by id" })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200, type: RoleResponseDto })
  getOne(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<RoleResponseDto> {
    return this.rolesService.getById(user, id);
  }

  @Patch(":id")
  @RequirePermissions("roles:update")
  @ResponseMessage("Role updated successfully")
  @ApiOperation({ summary: "Update a role name and/or permissions" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateRoleDto })
  @ApiWrappedResponse({ status: 200, type: RoleResponseDto })
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(user, id, body);
  }

  @Delete(":id")
  @HttpCode(200)
  @RequirePermissions("roles:delete")
  @ResponseMessage("Role deleted successfully")
  @ApiOperation({
    summary: "Delete a custom role",
    description: "Cannot delete Super Admin or roles that still have users.",
  })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200 })
  remove(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<{ ok: true }> {
    return this.rolesService.remove(user, id);
  }
}

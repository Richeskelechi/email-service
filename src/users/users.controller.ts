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
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SessionUser } from "../auth/auth.types";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { InviteUserDto, UpdateUserDto } from "./dto/user-input.dto";
import {
  InviteUserResponseDto,
  ListUsersQueryDto,
  PaginatedUsersResponseDto,
  UserResponseDto,
} from "./dto/user-response.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth("session")
@ApiSecurity("session")
@UseGuards(SessionAuthGuard, PermissionsGuard)
@Controller("v1/users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(201)
  @RequirePermissions("users:create")
  @ResponseMessage("User invited successfully")
  @ApiOperation({
    summary: "Invite a user to the organization",
    description:
      "Creates the user without a password and emails a set-password link.",
  })
  @ApiBody({ type: InviteUserDto })
  @ApiWrappedResponse({ status: 201, type: InviteUserResponseDto })
  invite(
    @CurrentUser() user: SessionUser,
    @Body() body: InviteUserDto,
  ): Promise<InviteUserResponseDto> {
    return this.usersService.invite(user, body);
  }

  @Get()
  @RequirePermissions("users:read")
  @ResponseMessage("Users retrieved successfully")
  @ApiOperation({ summary: "List users (paginated + filters)" })
  @ApiWrappedResponse({ status: 200, type: PaginatedUsersResponseDto })
  list(
    @CurrentUser() user: SessionUser,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(user, query);
  }

  @Get(":id")
  @RequirePermissions("users:read")
  @ResponseMessage("User retrieved successfully")
  @ApiOperation({ summary: "Get a user by id" })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200, type: UserResponseDto })
  getOne(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getById(user, id);
  }

  @Patch(":id")
  @RequirePermissions("users:update")
  @ResponseMessage("User updated successfully")
  @ApiOperation({ summary: "Update user details and/or roles" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateUserDto })
  @ApiWrappedResponse({ status: 200, type: UserResponseDto })
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(user, id, body);
  }

  @Delete(":id")
  @HttpCode(200)
  @RequirePermissions("users:delete")
  @ResponseMessage("User deleted successfully")
  @ApiOperation({ summary: "Delete a user" })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200 })
  remove(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<{ ok: true }> {
    return this.usersService.remove(user, id);
  }

  @Post(":id/resend-invite")
  @HttpCode(200)
  @RequirePermissions("users:create")
  @ResponseMessage("Invite email resent")
  @ApiOperation({
    summary: "Resend set-password invite email",
    description: "Only for users who have not set a password yet.",
  })
  @ApiParam({ name: "id" })
  @ApiWrappedResponse({ status: 200, type: InviteUserResponseDto })
  resendInvite(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<InviteUserResponseDto> {
    return this.usersService.resendInvite(user, id);
  }
}

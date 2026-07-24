import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { ApiWrappedResponse } from "../common/decorators/api-wrapped-response.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import {
  LoginResponseDto,
  MeResponseDto,
  SetPasswordResponseDto,
} from "./dto/auth-response.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto, ResetPasswordDto } from "./dto/password.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { SessionAuthGuard } from "./session-auth.guard";
import type { SessionUser } from "./auth.types";

@ApiTags("auth")
@Controller("v1/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("set-password")
  @HttpCode(200)
  @ResponseMessage("Password set successfully")
  @ApiOperation({
    summary: "Set password from invite email token",
    description: "Used when a user is invited and has no password yet.",
  })
  @ApiBody({ type: SetPasswordDto })
  @ApiWrappedResponse({ status: 200, type: SetPasswordResponseDto })
  setPassword(@Body() body: SetPasswordDto): Promise<SetPasswordResponseDto> {
    return this.authService.setPassword(body);
  }

  @Post("forgot-password")
  @HttpCode(200)
  @ResponseMessage("If that email exists, a reset link has been sent")
  @ApiOperation({
    summary: "Request a password reset email",
    description:
      "Always returns success to avoid email enumeration. Complete the reset with POST /v1/auth/reset-password.",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiWrappedResponse({ status: 200, type: SetPasswordResponseDto })
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<{ ok: true }> {
    return this.authService.forgotPassword(body);
  }

  @Post("reset-password")
  @HttpCode(200)
  @ResponseMessage("Password reset successfully")
  @ApiOperation({
    summary: "Reset password using the forgot-password email token",
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiWrappedResponse({ status: 200, type: SetPasswordResponseDto })
  resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<SetPasswordResponseDto> {
    return this.authService.resetPassword(body);
  }

  @Post("change-password")
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth("session")
  @ApiSecurity("session")
  @ResponseMessage("Password changed successfully")
  @ApiOperation({
    summary: "Change password while logged in",
    description:
      "Requires the current password. Invalidates all sessions after success.",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiWrappedResponse({ status: 200, type: SetPasswordResponseDto })
  changePassword(
    @CurrentUser() user: SessionUser,
    @Body() body: ChangePasswordDto,
  ): Promise<SetPasswordResponseDto> {
    return this.authService.changePassword(user.userId, body);
  }

  @Post("login")
  @HttpCode(200)
  @ResponseMessage("Login successful")
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiBody({ type: LoginDto })
  @ApiWrappedResponse({ status: 200, type: LoginResponseDto })
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth("session")
  @ApiSecurity("session")
  @ResponseMessage("Profile retrieved successfully")
  @ApiOperation({ summary: "Get the current session user" })
  @ApiWrappedResponse({ status: 200, type: MeResponseDto })
  me(@CurrentUser() user: SessionUser): Promise<MeResponseDto> {
    return this.authService.getMe(user.userId);
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth("session")
  @ApiSecurity("session")
  @ResponseMessage("Logged out successfully")
  @ApiOperation({ summary: "Invalidate the current session" })
  @ApiWrappedResponse({ status: 200, type: SetPasswordResponseDto })
  logout(@CurrentUser() user: SessionUser): Promise<{ ok: true }> {
    return this.authService.logout(user.sessionId);
  }
}

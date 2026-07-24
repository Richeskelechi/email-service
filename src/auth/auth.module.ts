import { Module, forwardRef } from "@nestjs/common";
import { TemplatesModule } from "../templates/templates.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PermissionsGuard } from "./permissions.guard";
import { SessionAuthGuard } from "./session-auth.guard";

@Module({
  imports: [forwardRef(() => TemplatesModule)],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, PermissionsGuard],
  exports: [AuthService, SessionAuthGuard, PermissionsGuard],
})
export class AuthModule {}

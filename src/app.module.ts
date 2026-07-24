import { Module } from "@nestjs/common";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { AuthModule } from "./auth/auth.module";
import { EmailModule } from "./email/email.module";
import { HealthController } from "./health.controller";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { RolesModule } from "./roles/roles.module";
import { TemplatesModule } from "./templates/templates.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    PermissionsModule,
    RolesModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ApiKeysModule,
    TemplatesModule,
    EmailModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

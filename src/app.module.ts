import { Module } from "@nestjs/common";
import { EmailModule } from "./email/email.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [OrganizationsModule, EmailModule],
  controllers: [HealthController],
})
export class AppModule {}

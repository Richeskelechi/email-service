import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [RolesModule, AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}

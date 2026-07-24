import { Module } from "@nestjs/common";
import { TemplatesModule } from "../templates/templates.module";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";

@Module({
  imports: [TemplatesModule],
  controllers: [EmailController],
  providers: [EmailService],
})
export class EmailModule {}

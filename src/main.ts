import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ErrorResponseDto } from "./common/dto/error-response.dto";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import {
  AcceptEmailResponseDto,
  MessageResponseDto,
} from "./email/dto/message-response.dto";
import { SendEmailDto } from "./email/dto/send-email.dto";
import { BulkSendEmailDto } from "./email/dto/bulk-send-email.dto";
import {
  BulkAcceptResponseDto,
  BulkMessagesResponseDto,
  BulkStatusResponseDto,
} from "./email/dto/bulk-response.dto";
import { CreateOrganizationDto } from "./organizations/dto/create-organization.dto";
import { OrganizationResponseDto } from "./organizations/dto/organization-response.dto";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("my-email")
    .setDescription(
      "Multi-tenant email delivery API. Create an org to receive test + live API keys, then send with Bearer auth.",
    )
    .setVersion("0.1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "Use me_test_… or me_live_… (or DEV_API_KEY locally)",
      },
      "api-key",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [
      CreateOrganizationDto,
      OrganizationResponseDto,
      SendEmailDto,
      BulkSendEmailDto,
      BulkAcceptResponseDto,
      BulkStatusResponseDto,
      BulkMessagesResponseDto,
      AcceptEmailResponseDto,
      MessageResponseDto,
      ErrorResponseDto,
    ],
  });
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen(env.PORT, "0.0.0.0");
  console.log(`API http://127.0.0.1:${env.PORT}`);
  console.log(`Swagger http://127.0.0.1:${env.PORT}/docs`);
}

bootstrap().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

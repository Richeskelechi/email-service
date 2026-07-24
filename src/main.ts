import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { PermissionsService } from "./permissions/permissions.service";
import { TemplatesService } from "./templates/templates.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const permissionsService = app.get(PermissionsService);
  console.log("[permissions] starting sync…");
  await permissionsService.syncPermissions();
  console.log("[permissions] sync finished");

  const templatesService = app.get(TemplatesService);
  console.log("[templates] starting system sync…");
  await templatesService.syncSystemTemplates();
  console.log("[templates] system sync finished");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

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
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Session",
        description: "Session token from POST /v1/auth/login",
      },
      "session",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
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

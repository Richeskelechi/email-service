import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  DEV_API_KEY: z.string().min(8),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  MAIL_FROM_DEFAULT: z.string().email().default("noreply@example.com"),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(2000),
  WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  WORKER_FANOUT_CHUNK: z.coerce.number().int().positive().default(100),
  BULK_MAX_RECIPIENTS: z.coerce.number().int().positive().default(1000),
  ORG_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  APP_BASE_URL: z.string().url().default("http://127.0.0.1:3070"),
  PASSWORD_SETUP_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(48),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
});

export const env = envSchema.parse(process.env);

import "dotenv/config";
import { z } from "zod";

/** Parse "true"/"false"; omit key → undefined (so presets can apply). */
const optionalBool = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
}, z.boolean().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["local", "staging", "production"]).default("local"),
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3000),
    DEV_API_KEY: z.string().min(8),

    /** Optional overrides — presets apply per NODE_ENV when omitted. */
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_SECURE: optionalBool,
    SMTP_STARTTLS: optionalBool,
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    /** Staging (Resend) API key — used as SMTP password when NODE_ENV=staging. */
    RESEND_API_KEY: z.string().optional(),

    MAIL_FROM_DEFAULT: z.email().default("noreply@citygroupsavings.com"),
    WORKER_POLL_MS: z.coerce.number().int().positive().default(2000),
    WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(20),
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    WORKER_FANOUT_CHUNK: z.coerce.number().int().positive().default(100),
    BULK_MAX_RECIPIENTS: z.coerce.number().int().positive().default(1000),
    ORG_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
    APP_BASE_URL: z.preprocess(
      (value) => {
        if (typeof value === "string" && value.length > 0) return value;
        return process.env.RENDER_EXTERNAL_URL ?? "http://127.0.0.1:3070";
      },
      z.url(),
    ),
    PASSWORD_SETUP_TOKEN_TTL_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(48),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "staging" && !data.RESEND_API_KEY && !data.SMTP_PASS) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY (or SMTP_PASS) is required when NODE_ENV=staging",
      });
    }
    if (data.NODE_ENV === "production" && !data.SMTP_HOST) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "SMTP_HOST is required when NODE_ENV=production",
      });
    }
  });

const parsed = envSchema.parse(process.env);

export type NodeEnv = z.infer<typeof envSchema>["NODE_ENV"];

export type SmtpConfig = {
  provider: "mailpit" | "resend" | "custom";
  host: string;
  port: number;
  /** Implicit TLS (typically port 465). */
  secure: boolean;
  /** Upgrade via STARTTLS after EHLO (typically port 587). */
  startTls: boolean;
  user?: string;
  pass?: string;
};

function resolveSmtp(): SmtpConfig {
  if (parsed.NODE_ENV === "local") {
    return {
      provider: "mailpit",
      host: parsed.SMTP_HOST ?? "127.0.0.1",
      port: parsed.SMTP_PORT ?? 1025,
      secure: parsed.SMTP_SECURE ?? false,
      startTls: parsed.SMTP_STARTTLS ?? false,
      user: parsed.SMTP_USER,
      pass: parsed.SMTP_PASS,
    };
  }

  if (parsed.NODE_ENV === "staging") {
    // Resend: 465 = implicit TLS, or 587 = STARTTLS
    const port = parsed.SMTP_PORT ?? 465;
    const secure = parsed.SMTP_SECURE ?? port === 465;
    const startTls =
      parsed.SMTP_STARTTLS ?? (!secure && port === 587);
    return {
      provider: "resend",
      host: parsed.SMTP_HOST ?? "smtp.resend.com",
      port,
      secure,
      startTls: secure ? false : startTls,
      user: parsed.SMTP_USER ?? "resend",
      pass: parsed.SMTP_PASS ?? parsed.RESEND_API_KEY,
    };
  }

  // production — your MTA
  const port = parsed.SMTP_PORT ?? 587;
  const secure = parsed.SMTP_SECURE ?? port === 465;
  const startTls = parsed.SMTP_STARTTLS ?? (!secure && port === 587);
  return {
    provider: "custom",
    host: parsed.SMTP_HOST!,
    port,
    secure,
    startTls: secure ? false : startTls,
    user: parsed.SMTP_USER,
    pass: parsed.SMTP_PASS,
  };
}

export const env = {
  ...parsed,
  smtp: resolveSmtp(),
};

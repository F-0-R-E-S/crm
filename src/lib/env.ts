import { z } from "zod";

const zBool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : v === "true" || v === "1"));

const isProd = (src: Record<string, string | undefined>) => src.NODE_ENV === "production";

const BaseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  INTAKE_MAX_PAYLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(64 * 1024),
  INTAKE_BULK_MAX_ITEMS: z.coerce.number().int().positive().default(100),
  INTAKE_BULK_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024),
  INTAKE_BULK_SYNC_THRESHOLD: z.coerce.number().int().positive().default(50),
  INTAKE_DEFAULT_SCHEMA_VERSION: z.string().default("2026-01"),
  INTAKE_STRICT_UNKNOWN_FIELDS: zBool.default(true),
  ANTIFRAUD_DEDUP_WINDOW_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  ANTIFRAUD_DEDUP_CROSS_AFFILIATE: zBool.default(false),
  ANTIFRAUD_FINGERPRINT_FALLBACK_MIN: z.coerce.number().int().positive().default(10),
  ANTIFRAUD_VOIP_CHECK_ENABLED: zBool.default(false),
  SANDBOX_TTL_DAYS: z.coerce.number().int().positive().default(7),
  WEBHOOK_RETRY_SCHEDULE_SEC: z.string().default("10,60,300,900,3600"),
  AUDIT_HASH_CHAIN_SECRET: z.string().min(16),
  TELEGRAM_WEBHOOK_BASE_URL: z.string().url().optional(),
  TELEGRAM_LINK_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
});

export type Env = z.infer<typeof BaseSchema> & { authSecret: string };

export function parseEnv(src: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  const parsed = BaseSchema.parse(src);
  const authSecret = parsed.NEXTAUTH_SECRET ?? parsed.AUTH_SECRET;
  if (!authSecret) {
    throw new Error("env: NEXTAUTH_SECRET or AUTH_SECRET is required (min 32 chars)");
  }
  if (
    isProd(src as Record<string, string | undefined>) &&
    parsed.AUDIT_HASH_CHAIN_SECRET === "change-me-in-prod-min-16-chars!"
  ) {
    throw new Error(
      "env: AUDIT_HASH_CHAIN_SECRET must be set to a non-placeholder value in production",
    );
  }
  return { ...parsed, authSecret };
}

export const env: Env = parseEnv(process.env);

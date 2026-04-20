import { z } from "zod";

const DANGEROUS_PATTERNS = [
  /<script\b/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|\bdrop\s+table\b|;--)/i,
];

const safeString = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => !DANGEROUS_PATTERNS.some((p) => p.test(v)), {
      message: "contains disallowed characters",
    });

export const IntakeSchema = z
  .object({
    external_lead_id: safeString(64).optional(),
    first_name: safeString(80).optional(),
    last_name: safeString(80).optional(),
    email: z.string().email().max(254).nullable().optional(),
    phone: safeString(32).nullable().optional(),
    geo: z.string().length(2),
    ip: z.string().min(1),
    landing_url: z.string().url().max(2048).optional(),
    sub_id: safeString(128).optional(),
    utm: z.record(z.string().max(64), z.unknown()).optional(),
    event_ts: z.string().datetime(),
  })
  .refine((v) => v.email || v.phone, { message: "email or phone required" });

export type IntakePayload = z.infer<typeof IntakeSchema>;

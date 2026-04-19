import { z } from "zod";

export const IntakeSchema = z
  .object({
    external_lead_id: z.string().max(64).optional(),
    first_name: z.string().max(80).optional(),
    last_name: z.string().max(80).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    geo: z.string().length(2),
    ip: z.string().min(1),
    landing_url: z.string().url().optional(),
    sub_id: z.string().max(128).optional(),
    utm: z.record(z.string(), z.unknown()).optional(),
    event_ts: z.string().datetime(),
  })
  .refine((v) => v.email || v.phone, { message: "email or phone required" });

export type IntakePayload = z.infer<typeof IntakeSchema>;

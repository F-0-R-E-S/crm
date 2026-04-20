import { z } from "zod";

export const CapCountryLimitInputSchema = z.object({
  country: z.string().length(2),
  limit: z.number().int().positive(),
});

export const CapDefinitionInputSchema = z.object({
  scope: z.enum(["AFFILIATE", "BROKER", "FLOW", "BRANCH", "TARGET"]),
  scopeRefId: z.string().min(1),
  window: z.enum(["HOURLY", "DAILY", "WEEKLY"]),
  limit: z.number().int().nonnegative(),
  timezone: z.string().min(1).default("UTC"),
  perCountry: z.boolean().optional().default(false),
  countryLimits: z.array(CapCountryLimitInputSchema).optional().default([]),
});

export const CapDefinitionsInputSchema = z.object({
  caps: z.array(CapDefinitionInputSchema),
});

export type CapDefinitionInput = z.infer<typeof CapDefinitionInputSchema>;
export type CapCountryLimitInput = z.infer<typeof CapCountryLimitInputSchema>;

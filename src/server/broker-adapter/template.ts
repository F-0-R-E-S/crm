import type { Lead } from "@prisma/client";

export function buildPayload(
  lead: Partial<Lead>,
  fieldMapping: Record<string, string>,
  staticPayload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [leadField, brokerField] of Object.entries(fieldMapping)) {
    const v = (lead as Record<string, unknown>)[leadField];
    if (v !== undefined && v !== null) out[brokerField] = v;
  }
  return { ...out, ...staticPayload };
}

import type { ZodObject, ZodRawShape, ZodSchema, z } from "zod";
import { intakeSchema_2026_01 } from "./v2026-01";

export type StrictMode = "strict" | "compat";

export type VersionStatus = "active" | "deprecated" | "sunset";

export interface VersionEntry {
  version: string;
  status: VersionStatus;
  schema: ZodSchema;
  deprecatedAt?: string;
  sunsetAt?: string;
}

const REGISTRY: Record<string, VersionEntry> = {
  "2026-01": { version: "2026-01", status: "active", schema: intakeSchema_2026_01 },
};

export const DEFAULT_VERSION = "2026-01";

export function isVersionSupported(v: string): boolean {
  return v in REGISTRY && REGISTRY[v].status !== "sunset";
}

export function getSchemaForVersion(v: string): ZodSchema | null {
  const entry = REGISTRY[v];
  if (!entry || entry.status === "sunset") return null;
  return entry.schema;
}

export function getVersionEntry(v: string): VersionEntry | null {
  return REGISTRY[v] ?? null;
}

export function listVersions(): VersionEntry[] {
  return Object.values(REGISTRY);
}

export function parseWithMode(
  schema: ZodSchema,
  raw: unknown,
  mode: StrictMode,
):
  | { success: true; data: unknown; unknownFields: string[] }
  | { success: false; issues: z.ZodIssue[] } {
  // Discover underlying ZodObject even when schema is wrapped in .refine()/.transform() (ZodEffects)
  // ZodEffects uses _def.schema; ZodObject is the top-level.
  let inner: unknown = schema;
  while (
    inner &&
    (inner as { _def?: { typeName?: string; schema?: unknown } })._def?.typeName === "ZodEffects"
  ) {
    inner = (inner as { _def: { schema: unknown } })._def.schema;
  }
  if (
    mode === "strict" &&
    typeof (inner as { strict?: () => ZodObject<ZodRawShape> }).strict === "function"
  ) {
    const strictObj = (inner as ZodObject<ZodRawShape>).strict();
    const first = strictObj.safeParse(raw);
    if (!first.success) return { success: false, issues: first.error.issues };
    // Re-apply full schema for refinements (email-or-phone etc.)
    const full = schema.safeParse(raw);
    if (!full.success) return { success: false, issues: full.error.issues };
    return { success: true, data: full.data, unknownFields: [] };
  }
  const r = schema.safeParse(raw);
  if (!r.success) return { success: false, issues: r.error.issues };
  const knownKeys = new Set(Object.keys(r.data as Record<string, unknown>));
  const rawKeys = raw && typeof raw === "object" ? Object.keys(raw as Record<string, unknown>) : [];
  const unknownFields = rawKeys.filter((k) => !knownKeys.has(k));
  return { success: true, data: r.data, unknownFields };
}

import { z } from "zod";

export const NodeIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

// ============================================================================
// PQL (Property Query Language) — canonical rule + gate schemas.
// Replaces the legacy FilterCondition shape with a richer vocabulary:
// 8 fields, 10 signs (ops), and a per-rule case-sensitive toggle.
// Extended by a registry-driven UI so new fields cost ~10 lines
// (see src/server/routing/pql/fields.ts).
// ============================================================================

export const PqlFieldSchema = z.enum([
  "geo",
  "subId",
  "utm_source",
  "utm_medium",
  "affiliateId",
  "timeOfDay",
  "phone",
  "hourOfDay",
]);

export const PqlSignSchema = z.enum([
  "eq",
  "neq",
  "in",
  "not_in",
  "contains",
  "starts_with",
  "ends_with",
  "gte",
  "lte",
  "matches",
]);

export const PqlRuleSchema = z.object({
  field: PqlFieldSchema,
  sign: PqlSignSchema,
  value: z.union([z.string(), z.array(z.string()), z.number()]),
  caseSensitive: z.boolean().default(false),
});

export const PqlGateSchema = z.object({
  rules: z.array(PqlRuleSchema).min(1),
  logic: z.enum(["AND", "OR"]).default("AND"),
});

// ----- Legacy FilterCondition alias (kept for callers that still import it;
// the new canonical type is PqlRule). The legacy shape used `op` instead of
// `sign` and had no `caseSensitive`; we rewrite legacy input into PqlRule
// in `preprocessFlowGraphInput` below so FilterNodeSchema itself stays
// discriminated-union-friendly.

export const FilterConditionSchema = z.object({
  field: z.enum(["geo", "subId", "utm_source", "utm_medium", "affiliateId", "timeOfDay"]),
  op: z.enum(["eq", "neq", "in", "not_in", "matches"]),
  value: z.union([z.string(), z.array(z.string()), z.number()]),
});

// ----- Layout metadata (unchanged from v1.5 S1.5-2)

export const NodeMetaSchema = z
  .object({
    pos: z.object({ x: z.number(), y: z.number() }).optional(),
  })
  .passthrough()
  .optional();

// ============================================================================
// Node schemas — every kind is a plain z.object to keep the FlowNode
// discriminated union clean. Legacy-shape Filter nodes get rewritten in
// `preprocessFlowGraphInput` before the union ever sees them.
// ============================================================================

export const EntryNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Entry"),
  label: z.string().max(120).optional(),
  meta: NodeMetaSchema,
});

export const FilterNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Filter"),
  label: z.string().max(120).optional(),
  rules: z.array(PqlRuleSchema).min(1),
  logic: z.enum(["AND", "OR"]).default("AND"),
  meta: NodeMetaSchema,
});

export const AlgorithmNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Algorithm"),
  label: z.string().max(120).optional(),
  mode: z.enum(["WEIGHTED_ROUND_ROBIN", "SLOTS_CHANCE"]),
  meta: NodeMetaSchema,
});

export const BrokerTargetNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("BrokerTarget"),
  brokerId: z.string().min(1),
  weight: z.number().int().min(1).max(1000).optional(),
  slots: z.number().int().min(1).max(10_000).optional(),
  chance: z.number().min(0.01).max(100).optional(),
  label: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
  pqlGate: PqlGateSchema.optional(),
  meta: NodeMetaSchema,
});

// Fallback triggers — extracted so SmartPool can reuse the shape
export const FallbackTriggersSchema = z.object({
  timeoutMs: z.number().int().min(500).max(30_000).default(2000),
  httpStatusCodes: z.array(z.number().int()).default([500, 502, 503, 504]),
  connectionError: z.boolean().default(true),
  explicitReject: z.boolean().default(true),
});

export const FallbackNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Fallback"),
  label: z.string().max(120).optional(),
  maxHop: z.number().int().min(1).max(5).default(3),
  triggers: FallbackTriggersSchema,
  meta: NodeMetaSchema,
});

// SmartPool — priority-ordered failover container. Compiled at publish time
// into a chain of FallbackStep rows; runtime reuses the existing fallback
// orchestrator.
export const SmartPoolNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("SmartPool"),
  label: z.string().max(120).optional(),
  maxHop: z.number().int().min(1).max(10).default(5),
  triggers: FallbackTriggersSchema,
  meta: NodeMetaSchema,
});

// ComparingSplit — A/B test container with comparison metric + sample size.
// Compiled at publish time into an Algorithm(WRR) node plus a
// FlowAlgorithmConfig row carrying the comparison metadata.
export const ComparingSplitNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("ComparingSplit"),
  label: z.string().max(120).optional(),
  compareMetric: z.enum(["push_rate", "accept_rate", "ftd_rate", "revenue_per_lead"]),
  sampleSize: z.number().int().min(50).max(100_000).default(500),
  meta: NodeMetaSchema,
});

export const ExitNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Exit"),
  label: z.string().max(120).optional(),
  meta: NodeMetaSchema,
});

export const FlowNodeSchema = z.discriminatedUnion("kind", [
  EntryNodeSchema,
  FilterNodeSchema,
  AlgorithmNodeSchema,
  BrokerTargetNodeSchema,
  FallbackNodeSchema,
  SmartPoolNodeSchema,
  ComparingSplitNodeSchema,
  ExitNodeSchema,
]);

export const FlowEdgeSchema = z.object({
  from: NodeIdSchema,
  to: NodeIdSchema,
  condition: z.enum(["default", "on_success", "on_fail"]).default("default"),
});

/**
 * Rewrite legacy Filter input ({conditions, op}) to the canonical new
 * shape ({rules, sign, caseSensitive}) BEFORE the discriminated union
 * parses. Runs on a raw `unknown` value; if the input is not object-like,
 * it's returned unchanged so Zod can surface the root-level error.
 *
 * This is the only place legacy Filter shapes are tolerated. Can be
 * dropped one release after all draft FlowVersions have been rewritten.
 */
export function preprocessFlowGraphInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as { nodes?: unknown[]; edges?: unknown };
  if (!Array.isArray(obj.nodes)) return raw;
  const rewrittenNodes = obj.nodes.map((n) => {
    if (!n || typeof n !== "object") return n;
    const node = n as Record<string, unknown>;
    if (node.kind !== "Filter") return node;
    // New shape already present: pass through.
    if (Array.isArray(node.rules) && !Array.isArray(node.conditions)) return node;
    const legacy = Array.isArray(node.conditions) ? (node.conditions as unknown[]) : [];
    const rules = legacy.map((c) => {
      const cond = (c ?? {}) as { field?: unknown; op?: unknown; value?: unknown };
      return {
        field: cond.field,
        sign: cond.op,
        value: cond.value,
        caseSensitive: false,
      };
    });
    const { conditions: _, ...rest } = node;
    return { ...rest, rules };
  });
  return { ...obj, nodes: rewrittenNodes };
}

export const FlowGraphSchema = z.preprocess(
  preprocessFlowGraphInput,
  z
    .object({
      nodes: z.array(FlowNodeSchema).min(2).max(300),
      edges: z.array(FlowEdgeSchema).max(500),
    })
    .refine((g) => new Set(g.nodes.map((n) => n.id)).size === g.nodes.length, {
      message: "duplicate node id",
      path: ["nodes"],
    }),
);

export type FlowGraph = z.infer<typeof FlowGraphSchema>;
export type FlowNode = z.infer<typeof FlowNodeSchema>;
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;
export type FilterNode = z.infer<typeof FilterNodeSchema>;
export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export type PqlRule = z.infer<typeof PqlRuleSchema>;
export type PqlGate = z.infer<typeof PqlGateSchema>;
export type PqlField = z.infer<typeof PqlFieldSchema>;
export type PqlSign = z.infer<typeof PqlSignSchema>;
export type FallbackTriggers = z.infer<typeof FallbackTriggersSchema>;
export type EntryNode = z.infer<typeof EntryNodeSchema>;
export type AlgorithmNode = z.infer<typeof AlgorithmNodeSchema>;
export type BrokerTargetNode = z.infer<typeof BrokerTargetNodeSchema>;
export type FallbackNode = z.infer<typeof FallbackNodeSchema>;
export type SmartPoolNode = z.infer<typeof SmartPoolNodeSchema>;
export type ComparingSplitNode = z.infer<typeof ComparingSplitNodeSchema>;
export type ExitNode = z.infer<typeof ExitNodeSchema>;

import { z } from "zod";

export const NodeIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const FilterConditionSchema = z.object({
  field: z.enum(["geo", "subId", "utm_source", "utm_medium", "affiliateId", "timeOfDay"]),
  op: z.enum(["eq", "neq", "in", "not_in", "matches"]),
  value: z.union([z.string(), z.array(z.string()), z.number()]),
});

export const EntryNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Entry"),
  label: z.string().max(120).optional(),
});

export const FilterNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Filter"),
  label: z.string().max(120).optional(),
  conditions: z.array(FilterConditionSchema).min(1),
  logic: z.enum(["AND", "OR"]).default("AND"),
});

export const AlgorithmNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Algorithm"),
  label: z.string().max(120).optional(),
  mode: z.enum(["WEIGHTED_ROUND_ROBIN", "SLOTS_CHANCE"]),
});

export const BrokerTargetNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("BrokerTarget"),
  brokerId: z.string().min(1),
  weight: z.number().int().min(1).max(1000).optional(),
  slots: z.number().int().min(1).max(10_000).optional(),
  chance: z.number().min(0.01).max(100).optional(),
  label: z.string().max(120).optional(),
});

export const FallbackNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Fallback"),
  label: z.string().max(120).optional(),
  maxHop: z.number().int().min(1).max(5).default(3),
  triggers: z.object({
    timeoutMs: z.number().int().min(500).max(30_000).default(2000),
    httpStatusCodes: z.array(z.number().int()).default([500, 502, 503, 504]),
    connectionError: z.boolean().default(true),
    explicitReject: z.boolean().default(true),
  }),
});

export const ExitNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Exit"),
  label: z.string().max(120).optional(),
});

export const FlowNodeSchema = z.discriminatedUnion("kind", [
  EntryNodeSchema,
  FilterNodeSchema,
  AlgorithmNodeSchema,
  BrokerTargetNodeSchema,
  FallbackNodeSchema,
  ExitNodeSchema,
]);

export const FlowEdgeSchema = z.object({
  from: NodeIdSchema,
  to: NodeIdSchema,
  condition: z.enum(["default", "on_success", "on_fail"]).default("default"),
});

export const FlowGraphSchema = z
  .object({
    nodes: z.array(FlowNodeSchema).min(2).max(200),
    edges: z.array(FlowEdgeSchema).max(500),
  })
  .refine((g) => new Set(g.nodes.map((n) => n.id)).size === g.nodes.length, {
    message: "duplicate node id",
    path: ["nodes"],
  });

export type FlowGraph = z.infer<typeof FlowGraphSchema>;
export type FlowNode = z.infer<typeof FlowNodeSchema>;
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;
export type FilterNode = z.infer<typeof FilterNodeSchema>;
export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export type EntryNode = z.infer<typeof EntryNodeSchema>;
export type AlgorithmNode = z.infer<typeof AlgorithmNodeSchema>;
export type BrokerTargetNode = z.infer<typeof BrokerTargetNodeSchema>;
export type FallbackNode = z.infer<typeof FallbackNodeSchema>;
export type ExitNode = z.infer<typeof ExitNodeSchema>;

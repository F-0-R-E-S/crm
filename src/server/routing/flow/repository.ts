import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { type FlowGraph, FlowGraphSchema } from "./model";
import { validateCapDefinitions, validateFlowGraph } from "./validator";

export interface CreateDraftInput {
  name: string;
  timezone: string;
  graph: FlowGraph;
  createdBy?: string;
  entryFilters?: Record<string, unknown>;
  fallbackPolicy?: Record<string, unknown>;
  algorithm?: Record<string, unknown>;
}

export async function createDraftFlow(input: CreateDraftInput) {
  FlowGraphSchema.parse(input.graph);
  return prisma.flow.create({
    data: {
      name: input.name,
      timezone: input.timezone,
      status: "DRAFT",
      createdBy: input.createdBy,
      versions: {
        create: {
          versionNumber: 1,
          graph: input.graph as unknown as Prisma.InputJsonValue,
          algorithm: (input.algorithm ?? {}) as Prisma.InputJsonValue,
          entryFilters: (input.entryFilters ?? {}) as Prisma.InputJsonValue,
          fallbackPolicy: (input.fallbackPolicy ?? {}) as Prisma.InputJsonValue,
        },
      },
    },
    include: { versions: { orderBy: { versionNumber: "asc" } } },
  });
}

export async function updateDraftGraph(flowId: string, graph: FlowGraph) {
  FlowGraphSchema.parse(graph);
  const current = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!current) throw new Error("flow_not_found");
  if (current.status === "ARCHIVED") throw new Error("flow_archived");
  const latest = current.versions[0];
  // If the latest version is an unpublished draft, update it in place — every
  // autosave otherwise creates a new FlowVersion row and the history gets
  // littered. New versions are forked only on top of a published one.
  if (latest && !latest.publishedAt) {
    await prisma.flowVersion.update({
      where: { id: latest.id },
      data: { graph: graph as unknown as Prisma.InputJsonValue },
    });
  } else {
    const nextN = (latest?.versionNumber ?? 0) + 1;
    await prisma.flowVersion.create({
      data: {
        flowId,
        versionNumber: nextN,
        graph: graph as unknown as Prisma.InputJsonValue,
        algorithm: {},
        entryFilters: {},
        fallbackPolicy: {},
      },
    });
  }
  return prisma.flow.findUniqueOrThrow({
    where: { id: flowId },
    include: { versions: { orderBy: { versionNumber: "asc" } } },
  });
}

export async function listFlows(filter?: { status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  return prisma.flow.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      activeVersion: true,
    },
  });
}

export async function loadFlowById(id: string) {
  const flow = await prisma.flow.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { versionNumber: "asc" } },
      activeVersion: {
        include: {
          branches: true,
          fallbackSteps: true,
          capDefs: { include: { countryLimits: true } },
        },
      },
    },
  });
  if (!flow) throw new Error("flow_not_found");
  return flow;
}

export async function validateDraftOrThrow(flowId: string) {
  const flow = await loadFlowById(flowId);
  const latest = flow.versions[flow.versions.length - 1];
  const graphRes = validateFlowGraph(latest.graph as unknown as FlowGraph);

  const caps = await prisma.capDefinition.findMany({
    where: { flowVersionId: latest.id },
    include: { countryLimits: true },
  });
  const capRes = validateCapDefinitions(
    caps.map((c) => ({
      id: c.id,
      scope: c.scope,
      scopeRefId: c.scopeRefId,
      window: c.window,
      perCountry: c.perCountry,
      countryLimits: c.countryLimits.map((cl) => ({ country: cl.country, limit: cl.limit })),
    })),
  );

  const combined = [...graphRes.errors, ...capRes.errors];
  if (combined.length > 0) {
    const err = new Error("flow_validation_error");
    (err as Error & { details?: unknown }).details = combined;
    throw err;
  }
  return { flow, latest };
}

import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../tests/helpers/db";
import type { FlowGraph } from "./model";
import { createDraftFlow, listFlows, loadFlowById, updateDraftGraph } from "./repository";

const graph: FlowGraph = {
  nodes: [
    { id: "e", kind: "Entry" },
    { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "t", kind: "BrokerTarget", brokerId: "b1", weight: 100 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" },
    { from: "a", to: "t", condition: "default" },
    { from: "t", to: "x", condition: "default" },
  ],
};

describe("flow repository", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("createDraftFlow создаёт DRAFT + version 1", async () => {
    const flow = await createDraftFlow({
      name: "Acme RU",
      timezone: "Europe/Moscow",
      graph,
      createdBy: "u1",
    });
    expect(flow.status).toBe("DRAFT");
    expect(flow.versions).toHaveLength(1);
    expect(flow.versions[0].versionNumber).toBe(1);
  });

  it("updateDraftGraph обновляет неопубликованную версию in-place (автосейв не плодит версии)", async () => {
    const flow = await createDraftFlow({ name: "x", timezone: "UTC", graph });
    const firstVersionId = flow.versions[0].id;
    const mutated = {
      ...graph,
      nodes: [...graph.nodes, { id: "y", kind: "Exit" as const }],
    };
    const updated = await updateDraftGraph(flow.id, mutated);
    expect(updated.versions).toHaveLength(1);
    expect(updated.versions[0].id).toBe(firstVersionId);
    expect(updated.versions[0].versionNumber).toBe(1);
    const g = updated.versions[0].graph as unknown as FlowGraph;
    expect(g.nodes).toHaveLength(5);
  });

  it("updateDraftGraph форкает новую версию поверх PUBLISHED", async () => {
    const flow = await createDraftFlow({ name: "x", timezone: "UTC", graph });
    // Simulate publish by stamping publishedAt on v1.
    await prisma.flowVersion.update({
      where: { id: flow.versions[0].id },
      data: { publishedAt: new Date() },
    });
    const mutated = {
      ...graph,
      nodes: [...graph.nodes, { id: "y2", kind: "Exit" as const }],
    };
    const updated = await updateDraftGraph(flow.id, mutated);
    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[1].versionNumber).toBe(2);
    expect(updated.versions[1].publishedAt).toBeNull();
  });

  it("listFlows возвращает свежайшие первыми", async () => {
    await createDraftFlow({ name: "A", timezone: "UTC", graph });
    await new Promise((r) => setTimeout(r, 10));
    await createDraftFlow({ name: "B", timezone: "UTC", graph });
    const list = await listFlows({ status: "DRAFT" });
    expect(list.map((f) => f.name)).toEqual(["B", "A"]);
  });

  it("loadFlowById 404 на неизвестном id", async () => {
    await expect(loadFlowById("ghost")).rejects.toThrow(/not_found/);
  });
});

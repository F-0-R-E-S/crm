import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../tests/helpers/db";
import type { FlowGraph } from "./model";
import { archiveFlow, publishFlow } from "./publish";
import { createDraftFlow, updateDraftGraph } from "./repository";

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

describe("publishFlow", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("переводит flow в PUBLISHED и ставит activeVersionId на свежайший version", async () => {
    const flow = await createDraftFlow({ name: "X", timezone: "UTC", graph });
    const res = await publishFlow(flow.id, "u1");
    expect(res.status).toBe("PUBLISHED");
    expect(res.activeVersionId).toBe(flow.versions[0].id);
  });

  it("повторный publish свежайшей версии атомарно переключает activeVersionId", async () => {
    const flow = await createDraftFlow({ name: "X", timezone: "UTC", graph });
    await publishFlow(flow.id, "u1");
    const updated = await updateDraftGraph(flow.id, {
      ...graph,
      nodes: [...graph.nodes, { id: "y", kind: "Exit" }],
    });
    const v2 = updated.versions[1];
    const after = await publishFlow(flow.id, "u1");
    expect(after.activeVersionId).toBe(v2.id);
  });

  it("publish с невалидным графом → flow_validation_error", async () => {
    const bad: FlowGraph = { nodes: [{ id: "e", kind: "Entry" }, { id: "x", kind: "Exit" }], edges: [] };
    const flow = await createDraftFlow({ name: "B", timezone: "UTC", graph: bad });
    await expect(publishFlow(flow.id, "u1")).rejects.toThrow(/flow_validation_error/);
  });

  it("archiveFlow переводит в ARCHIVED и обнуляет activeVersionId", async () => {
    const flow = await createDraftFlow({ name: "X", timezone: "UTC", graph });
    await publishFlow(flow.id, "u1");
    const arch = await archiveFlow(flow.id, "u1");
    expect(arch.status).toBe("ARCHIVED");
    expect(arch.activeVersionId).toBeNull();
  });
});

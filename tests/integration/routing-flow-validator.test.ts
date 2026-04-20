import { POST as postPublish } from "@/app/api/v1/routing/flows/[flowId]/publish/route";
import { POST as postCreate } from "@/app/api/v1/routing/flows/route";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "u", role: "ADMIN" } }) }));

describe("REST publish — validator errors carry node_id + error_code", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("cycle → details[0].code=cycle_detected, node_id present", async () => {
    const graph = {
      nodes: [
        { id: "e", kind: "Entry" as const },
        { id: "a", kind: "Algorithm" as const, mode: "WEIGHTED_ROUND_ROBIN" as const },
        { id: "t", kind: "BrokerTarget" as const, brokerId: "b1", weight: 100 },
        { id: "x", kind: "Exit" as const },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" as const },
        { from: "a", to: "t", condition: "default" as const },
        { from: "t", to: "x", condition: "default" as const },
        { from: "x", to: "a", condition: "default" as const },
      ],
    };
    const { id } = await (
      await postCreate(
        new Request("http://x/api/v1/routing/flows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "X", timezone: "UTC", graph }),
        }),
      )
    ).json();
    const r = await postPublish(
      new Request(`http://x/api/v1/routing/flows/${id}/publish`, { method: "POST" }),
      { params: Promise.resolve({ flowId: id }) },
    );
    expect(r.status).toBe(422);
    const b = await r.json();
    expect(b.error.code).toBe("flow_validation_error");
    const cyc = b.error.details.find((d: { code: string }) => d.code === "cycle_detected");
    expect(cyc).toBeTruthy();
    expect(cyc.node_id).toBeTruthy();
  });
});

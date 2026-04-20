import { PUT as putAlgo } from "@/app/api/v1/routing/flows/[flowId]/algorithm/route";
import { POST as postArchive } from "@/app/api/v1/routing/flows/[flowId]/archive/route";
import { POST as postPublish } from "@/app/api/v1/routing/flows/[flowId]/publish/route";
import { GET as getById, PUT as putById } from "@/app/api/v1/routing/flows/[flowId]/route";
import { GET as getList, POST as postCreate } from "@/app/api/v1/routing/flows/route";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "u-admin", role: "ADMIN" } }),
}));

const graph = {
  nodes: [
    { id: "e", kind: "Entry" },
    { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "t", kind: "BrokerTarget", brokerId: "bX", weight: 100 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" },
    { from: "a", to: "t", condition: "default" },
    { from: "t", to: "x", condition: "default" },
  ],
};

describe("REST /api/v1/routing/flows", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("POST create → 201", async () => {
    const r = await postCreate(
      new Request("http://x/api/v1/routing/flows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "F1", timezone: "UTC", graph }),
      }),
    );
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.id).toBeTruthy();
    expect(b.status).toBe("DRAFT");
  });

  it("GET list → массив", async () => {
    await postCreate(
      new Request("http://x/api/v1/routing/flows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "F1", timezone: "UTC", graph }),
      }),
    );
    const r = await getList(new Request("http://x/api/v1/routing/flows"));
    const b = await r.json();
    expect(Array.isArray(b.flows)).toBe(true);
    expect(b.flows).toHaveLength(1);
  });

  it("PUT обновляет граф", async () => {
    const created = await (
      await postCreate(
        new Request("http://x/api/v1/routing/flows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "F1", timezone: "UTC", graph }),
        }),
      )
    ).json();
    const r = await putById(
      new Request(`http://x/api/v1/routing/flows/${created.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ graph }),
      }),
      { params: Promise.resolve({ flowId: created.id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.versions.length).toBeGreaterThanOrEqual(2);
  });

  it("GET byId 404 на ghost", async () => {
    const r = await getById(new Request("http://x/api/v1/routing/flows/ghost"), {
      params: Promise.resolve({ flowId: "ghost" }),
    });
    expect(r.status).toBe(404);
  });

  it("POST publish → 200 + status PUBLISHED", async () => {
    const { id } = await (
      await postCreate(
        new Request("http://x/api/v1/routing/flows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "F1", timezone: "UTC", graph }),
        }),
      )
    ).json();
    const r = await postPublish(
      new Request(`http://x/api/v1/routing/flows/${id}/publish`, { method: "POST" }),
      { params: Promise.resolve({ flowId: id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.status).toBe("PUBLISHED");
    expect(b.activeVersionId).toBeTruthy();
  });

  it("POST publish невалидного графа → 422 flow_validation_error + details", async () => {
    const bad = { ...graph, nodes: graph.nodes.filter((n) => n.kind !== "Exit") };
    const { id } = await (
      await postCreate(
        new Request("http://x/api/v1/routing/flows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "F", timezone: "UTC", graph: bad }),
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
    expect(b.error.details).toBeTruthy();
  });

  it("PUT algorithm — WRR params OK", async () => {
    const { id } = await (
      await postCreate(
        new Request("http://x/api/v1/routing/flows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "F", timezone: "UTC", graph }),
        }),
      )
    ).json();
    const r = await putAlgo(
      new Request(`http://x/api/v1/routing/flows/${id}/algorithm`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope: "FLOW",
          mode: "WEIGHTED_ROUND_ROBIN",
          params: { weights: { "t-1": 70, "t-2": 30 } },
        }),
      }),
      { params: Promise.resolve({ flowId: id }) },
    );
    expect(r.status).toBe(200);
  });

  it("PUT algorithm — chance sum != 100 → 422", async () => {
    const { id } = await (
      await postCreate(
        new Request("http://x/api/v1/routing/flows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "F", timezone: "UTC", graph }),
        }),
      )
    ).json();
    const r = await putAlgo(
      new Request(`http://x/api/v1/routing/flows/${id}/algorithm`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope: "FLOW",
          mode: "SLOTS_CHANCE",
          params: { chance: { "t-1": 40, "t-2": 40 } },
        }),
      }),
      { params: Promise.resolve({ flowId: id }) },
    );
    expect(r.status).toBe(422);
    const b = await r.json();
    expect(b.error.code).toBe("invalid_probability_sum");
  });

  it("POST archive после publish → 200 + ARCHIVED", async () => {
    const { id } = await (
      await postCreate(
        new Request("http://x/api/v1/routing/flows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "F", timezone: "UTC", graph }),
        }),
      )
    ).json();
    await postPublish(
      new Request(`http://x/api/v1/routing/flows/${id}/publish`, { method: "POST" }),
      { params: Promise.resolve({ flowId: id }) },
    );
    const r = await postArchive(
      new Request(`http://x/api/v1/routing/flows/${id}/archive`, { method: "POST" }),
      { params: Promise.resolve({ flowId: id }) },
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.status).toBe("ARCHIVED");
  });
});

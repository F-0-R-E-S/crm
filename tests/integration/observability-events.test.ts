import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { redis } from "@/server/redis";
import { executeFlow } from "@/server/routing/engine";
import type { FlowGraph } from "@/server/routing/flow/model";
import { publishFlow } from "@/server/routing/flow/publish";
import { createDraftFlow } from "@/server/routing/flow/repository";
import { emitTelegramEvent } from "@/server/telegram/emit";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";
import { runE2EFlow } from "../helpers/e2e-flow";

describe("structured logging contract", () => {
  let mockBrokerStop: (() => Promise<void>) | null = null;
  let capturedEvents: string[] = [];
  let capturedCalls: unknown[][] = [];

  beforeAll(async () => {
    await resetDb();
    await redis.flushdb();
    const spy = vi.spyOn(logger, "info");

    // Run e2e flow → produces intake.*, fraud.score, broker.push, telegram.emit (via NEW_LEAD)
    const e2e = await runE2EFlow();
    mockBrokerStop = () => e2e.mockBroker.stop();

    // Also drive the engine directly to produce routing.decision
    const broker = await prisma.broker.findFirstOrThrow({ where: { name: "e2e-v1-broker" } });
    const graph: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: broker.id, weight: 100 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    };
    const flow = await createDraftFlow({ name: "obs-flow", timezone: "UTC", graph });
    await publishFlow(flow.id, "system");
    await executeFlow({
      flowId: flow.id,
      mode: "dryRun",
      lead: { id: "obs-lead-1", affiliateId: e2e.affiliateId, geo: "US" },
    });

    // Explicit telegram.emit invocation in case e2e intake path didn't trigger it
    // (no matching subscriptions is fine — we just need the event line).
    await emitTelegramEvent("NEW_LEAD", { test: true });

    capturedCalls = spy.mock.calls as unknown[][];
    capturedEvents = capturedCalls
      .map((c) => {
        const arg = c[0] as Record<string, unknown> | undefined;
        return (arg?.event as string) ?? "";
      })
      .filter(Boolean);
    spy.mockRestore();
  }, 30_000);

  afterAll(async () => {
    if (mockBrokerStop) await mockBrokerStop();
  });

  it("emits the six critical-path events", () => {
    for (const ev of [
      "intake.request",
      "intake.response",
      "routing.decision",
      "broker.push",
      "fraud.score",
      "telegram.emit",
    ]) {
      expect(capturedEvents).toContain(ev);
    }
  });

  it("routing.decision carries broker_id and decided_in_ms", () => {
    const routingCall = capturedCalls.find(
      (c) => (c[0] as Record<string, unknown>)?.event === "routing.decision",
    );
    expect(routingCall).toBeDefined();
    const payload = routingCall![0] as Record<string, unknown>;
    expect(typeof payload.broker_id).toBe("string");
    expect(typeof payload.decided_in_ms).toBe("number");
  });

  it("broker.push carries outcome and latency_ms", () => {
    const pushCall = capturedCalls.find(
      (c) => (c[0] as Record<string, unknown>)?.event === "broker.push",
    );
    expect(pushCall).toBeDefined();
    const payload = pushCall![0] as Record<string, unknown>;
    expect(["success", "failure"]).toContain(payload.outcome);
    expect(typeof payload.latency_ms).toBe("number");
  });
});

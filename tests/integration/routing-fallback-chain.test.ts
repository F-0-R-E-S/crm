import { redis } from "@/server/redis";
import {
  buildFallbackPlan,
  classifyPushResult,
  detectFallbackCycle,
} from "@/server/routing/fallback/orchestrator";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("fallback chain fault-injection", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("timeout >2s → failover", () => {
    const verdict = classifyPushResult(
      { httpStatus: 200, durationMs: 2500 },
      { timeoutMs: 2000, httpStatusCodes: [], connectionError: true, explicitReject: true },
    );
    expect(verdict).toBe("failover");
  });

  it("5xx классифицируется как failover", () => {
    const v = classifyPushResult(
      { httpStatus: 503 },
      {
        timeoutMs: 2000,
        httpStatusCodes: [500, 502, 503, 504],
        connectionError: true,
        explicitReject: true,
      },
    );
    expect(v).toBe("failover");
  });

  it("connection error → failover", () => {
    const v = classifyPushResult(
      { connectionError: true },
      { timeoutMs: 2000, httpStatusCodes: [], connectionError: true, explicitReject: true },
    );
    expect(v).toBe("failover");
  });

  it("4xx non-reject → terminal (не fallback)", () => {
    const v = classifyPushResult(
      { httpStatus: 400 },
      { timeoutMs: 2000, httpStatusCodes: [500], connectionError: true, explicitReject: true },
    );
    expect(v).toBe("terminal");
  });

  it("explicit_reject → failover", () => {
    const v = classifyPushResult(
      { httpStatus: 200, rejectReason: "blacklisted" },
      { timeoutMs: 2000, httpStatusCodes: [], connectionError: true, explicitReject: true },
    );
    expect(v).toBe("failover");
  });

  it("build plan respects max_hop = 5 cap", () => {
    const chain = Array.from({ length: 10 }, (_, i) => ({
      fromNodeId: `t${i}`,
      toNodeId: `t${i + 1}`,
      hopOrder: 1,
      triggers: {
        timeoutMs: 2000,
        httpStatusCodes: [],
        connectionError: true,
        explicitReject: true,
      },
    }));
    const plan = buildFallbackPlan("t0", chain, 5);
    expect(plan).toHaveLength(5);
  });

  it("cycle detection на 3-звенной петле", () => {
    const cyc = [
      {
        fromNodeId: "a",
        toNodeId: "b",
        hopOrder: 1,
        triggers: {
          timeoutMs: 2000,
          httpStatusCodes: [],
          connectionError: false,
          explicitReject: false,
        },
      },
      {
        fromNodeId: "b",
        toNodeId: "c",
        hopOrder: 1,
        triggers: {
          timeoutMs: 2000,
          httpStatusCodes: [],
          connectionError: false,
          explicitReject: false,
        },
      },
      {
        fromNodeId: "c",
        toNodeId: "a",
        hopOrder: 1,
        triggers: {
          timeoutMs: 2000,
          httpStatusCodes: [],
          connectionError: false,
          explicitReject: false,
        },
      },
    ];
    const r = detectFallbackCycle(cyc);
    expect(r.ok).toBe(false);
  });
});

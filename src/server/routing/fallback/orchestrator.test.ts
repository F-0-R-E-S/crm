import { describe, expect, it } from "vitest";
import {
  type FallbackStepSpec,
  type TriggerClassifier,
  buildFallbackPlan,
  detectFallbackCycle,
} from "./orchestrator";

const steps: FallbackStepSpec[] = [
  {
    fromNodeId: "t-primary",
    toNodeId: "t-backup1",
    hopOrder: 1,
    triggers: {
      timeoutMs: 2000,
      httpStatusCodes: [500, 502, 503, 504],
      connectionError: true,
      explicitReject: true,
    },
  },
  {
    fromNodeId: "t-backup1",
    toNodeId: "t-backup2",
    hopOrder: 1,
    triggers: {
      timeoutMs: 2000,
      httpStatusCodes: [500, 502, 503, 504],
      connectionError: true,
      explicitReject: true,
    },
  },
];

describe("fallback orchestrator", () => {
  it("buildFallbackPlan — линейная цепочка до max_hop", () => {
    const plan = buildFallbackPlan("t-primary", steps, 5);
    expect(plan.map((s) => s.toNodeId)).toEqual(["t-backup1", "t-backup2"]);
  });

  it("respects max_hop limit", () => {
    const plan = buildFallbackPlan("t-primary", steps, 1);
    expect(plan).toHaveLength(1);
  });

  it("detectFallbackCycle — простой цикл", () => {
    const cyc: FallbackStepSpec[] = [
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
    if (!r.ok) expect(r.cycleStart).toBeTruthy();
  });

  it("classifies fetch 503 → failover", () => {
    const classify: TriggerClassifier = (result) => {
      if (result.httpStatus && [500, 502, 503, 504].includes(result.httpStatus)) return "failover";
      return "ok";
    };
    expect(classify({ httpStatus: 503 })).toBe("failover");
    expect(classify({ httpStatus: 200 })).toBe("ok");
  });
});

import { describe, expect, it } from "vitest";
import { render as renderApplied } from "./scheduled-change-applied";
import { render as renderFailed } from "./scheduled-change-failed";

describe("scheduled-change telegram templates", () => {
  it("renders APPLIED with entity + patch summary + latency", () => {
    const msg = renderApplied({
      id: "sc-abcdef123",
      entityType: "Broker",
      entityId: "brk-xyz-7891011",
      patch: { isActive: false, dailyCap: 20 },
      latencyMs: 65_000,
    });
    expect(msg).toMatch(/Scheduled change applied/);
    expect(msg).toMatch(/Broker/);
    expect(msg).toMatch(/brk-xyz-78/);
    expect(msg).toMatch(/isActive/);
    expect(msg).toMatch(/dailyCap/);
    expect(msg).toMatch(/65s/);
  });

  it("renders FAILED with error message", () => {
    const msg = renderFailed({
      id: "sc-1",
      entityType: "Flow",
      entityId: "flow-abc",
      errorMessage: "[disallowed_field] name",
    });
    expect(msg).toMatch(/FAILED/);
    expect(msg).toMatch(/disallowed_field/);
    expect(msg).toMatch(/Flow/);
  });
});

import { describe, expect, it } from "vitest";
import { buildAlertLogWhere } from "./alertLog-filter";

describe("buildAlertLogWhere", () => {
  it("returns an empty clause for default input", () => {
    expect(buildAlertLogWhere({})).toEqual({});
  });

  it("filters by ruleKey when provided", () => {
    expect(buildAlertLogWhere({ ruleKey: "intake_error_rate" })).toEqual({
      ruleKey: "intake_error_rate",
    });
  });

  it("maps ack=acked to {NOT: {ackedAt: null}} and ack=unacked to {ackedAt: null}", () => {
    expect(buildAlertLogWhere({ ack: "acked" })).toEqual({ NOT: { ackedAt: null } });
    expect(buildAlertLogWhere({ ack: "unacked" })).toEqual({ ackedAt: null });
    expect(buildAlertLogWhere({ ack: "all" })).toEqual({});
  });

  it("combines date-range with ack + ruleKey", () => {
    const from = new Date("2026-04-01T00:00:00Z");
    const to = new Date("2026-04-20T00:00:00Z");
    expect(
      buildAlertLogWhere({ ruleKey: "push_fail_rate", ack: "unacked", from, to }),
    ).toEqual({
      ruleKey: "push_fail_rate",
      ackedAt: null,
      triggeredAt: { gte: from, lte: to },
    });
  });

  it("emits triggeredAt with only gte when `to` is omitted", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(buildAlertLogWhere({ from })).toEqual({ triggeredAt: { gte: from } });
  });
});

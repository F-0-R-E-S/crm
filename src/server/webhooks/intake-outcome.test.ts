import { describe, expect, it } from "vitest";
import { buildIntakeEvent, signPayload } from "./intake-outcome";

describe("intake-outcome dispatcher", () => {
  it("signPayload даёт детерминированный HMAC-SHA256", () => {
    const sig = signPayload("secret", '{"a":1}');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(signPayload("secret", '{"a":1}')).toBe(sig);
  });

  it("buildIntakeEvent форматирует event", () => {
    const e = buildIntakeEvent("intake.accepted", {
      leadId: "L1",
      affiliateId: "A1",
      traceId: "T1",
    });
    expect(e.event).toBe("intake.accepted");
    expect(e.data.lead_id).toBe("L1");
    expect(e.data.affiliate_id).toBe("A1");
    expect(e.data.trace_id).toBe("T1");
    expect(e.event_id).toBeTruthy();
    expect(e.emitted_at).toBeTruthy();
  });
});

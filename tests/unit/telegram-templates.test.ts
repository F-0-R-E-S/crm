import { TELEGRAM_EVENT_TYPES } from "@/server/telegram/event-catalog";
import { TEMPLATES } from "@/server/telegram/templates";
import { describe, expect, it } from "vitest";

describe("telegram templates — non-empty and within 4096", () => {
  it("every registered renderer produces a bounded string", () => {
    for (const [_type, render] of Object.entries(TEMPLATES)) {
      const out = render?.({
        leadId: "X",
        brokerName: "B",
        brokerId: "B1",
        affiliateName: "A",
        affiliateId: "A1",
        geo: "US",
        errorStreak: 3,
        downtimeMinutes: 5,
        scope: "BROKER",
        scopeName: "B",
        window: "DAILY",
        limit: 100,
        stage: "auth",
        lastError: "boom",
        targetUptime: "99%",
        actualUptime: "90%",
        windowSize: 100,
        poolId: "p1",
        healthy: 3,
        total: 10,
        degradationPercent: 70,
        latencyMs: 120,
      });
      expect(out).toBeTruthy();
      expect((out ?? "").length).toBeGreaterThan(0);
      expect((out ?? "").length).toBeLessThanOrEqual(4096);
    }
  });

  it("all 23 event types have a registered template", () => {
    for (const t of TELEGRAM_EVENT_TYPES) {
      expect(TEMPLATES[t], `missing template for ${t}`).toBeDefined();
    }
  });
});

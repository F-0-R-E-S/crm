import { extractJobs } from "@/../scripts/docs-regen/extractors/jobs";
import { describe, expect, it } from "vitest";

describe("jobs extractor", () => {
  it("finds push-lead job and tags it under broker-push", async () => {
    const map = await extractJobs({ jobsDir: "src/server/jobs" });
    const brokerPush = map.get("broker-push") ?? [];
    expect(brokerPush.some((s) => s.heading === "push-lead")).toBe(true);
  });

  it("includes cron schedule when present", async () => {
    const map = await extractJobs({ jobsDir: "src/server/jobs" });
    const analytics = map.get("analytics") ?? [];
    const daily = analytics.find((s) => s.heading === "analytics-roll-daily");
    expect(daily).toBeDefined();
    expect(daily!.body).toMatch(/schedule/);
  });
});

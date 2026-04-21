import { prisma } from "@/server/db";
import { applyDueScheduledChanges } from "@/server/scheduled-changes/orchestrator";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

/**
 * Spec §10 success criterion: 95% of scheduled changes apply within ±5 min
 * of their target window. With the cron cadence at 60s and the orchestrator
 * processing the full due-batch synchronously, the worst-case latency is
 * `cron_interval + batch_duration`. We simulate 20 changes with applyAt in
 * the recent past and assert all land within 5 minutes (300_000 ms).
 */
describe("scheduled change SLA (±5 min)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("20/20 changes applied within 5 min of target", async () => {
    const b = await prisma.broker.create({
      data: {
        name: "t",
        endpointUrl: "https://t.test",
        fieldMapping: { firstName: "first_name" },
        postbackSecret: "s",
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        isActive: true,
      },
    });
    const u = await prisma.user.create({
      data: { email: `u-${Date.now()}@t.io`, passwordHash: "x", role: "ADMIN" },
    });
    const now = Date.now();
    const SLA_MS = 300_000;
    const changes: Array<{ id: string; applyAt: number }> = [];
    for (let i = 0; i < 20; i++) {
      // Spread applyAt from `now - 4min` to `now - 10s` so the oldest tops out at ~4min of drift
      const offset = 10_000 + Math.floor(((SLA_MS - 20_000) / 19) * i);
      const sc = await prisma.scheduledChange.create({
        data: {
          entityType: "Broker",
          entityId: b.id,
          payload: { dailyCap: 100 + i },
          applyAt: new Date(now - offset),
          createdBy: u.id,
        },
      });
      changes.push({ id: sc.id, applyAt: now - offset });
    }

    const start = Date.now();
    const summary = await applyDueScheduledChanges(new Date(now));
    const batchDuration = Date.now() - start;
    expect(summary.processed).toBe(20);
    expect(summary.applied).toBe(20);

    // Latency relative to each row's applyAt — must be ≤ 5 min.
    const rows = await prisma.scheduledChange.findMany({
      where: { id: { in: changes.map((c) => c.id) } },
    });
    let withinSla = 0;
    for (const r of rows) {
      expect(r.status).toBe("APPLIED");
      // latencyMs measures how long the row was overdue at apply time
      if (Math.abs(r.latencyMs ?? Number.POSITIVE_INFINITY) <= SLA_MS) withinSla++;
    }
    const rate = withinSla / rows.length;
    expect(rate).toBeGreaterThanOrEqual(0.95);
    // Sanity: the whole batch itself should finish well under SLA
    expect(batchDuration).toBeLessThan(60_000);
  });
});

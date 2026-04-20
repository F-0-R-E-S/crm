import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { aggregateMetrics } from "./metrics";

describe("aggregateMetrics", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("суммирует accepted/rejected/duplicates по интервалу", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "m" } });
    const now = new Date();
    await prisma.lead.createMany({
      data: [
        { affiliateId: aff.id, geo: "UA", ip: "1.1.1.1", eventTs: now, traceId: "m1", state: "NEW" },
        {
          affiliateId: aff.id,
          geo: "UA",
          ip: "1.1.1.1",
          eventTs: now,
          traceId: "m2",
          state: "REJECTED",
          rejectReason: "duplicate",
        },
        {
          affiliateId: aff.id,
          geo: "UA",
          ip: "1.1.1.1",
          eventTs: now,
          traceId: "m3",
          state: "REJECTED",
          rejectReason: "ip_blocked",
        },
      ],
    });

    const res = await aggregateMetrics({
      from: new Date(Date.now() - 3600_000),
      to: new Date(Date.now() + 3600_000),
      interval: "1h",
      groupBy: null,
    });
    const total = res.reduce((s, b) => s + b.accepted + b.rejected, 0);
    expect(total).toBe(3);
    const accepted = res.reduce((s, b) => s + b.accepted, 0);
    expect(accepted).toBe(1);
    const duplicates = res.reduce((s, b) => s + b.duplicates, 0);
    expect(duplicates).toBe(1);
  });
});

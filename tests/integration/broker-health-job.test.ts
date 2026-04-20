import { prisma } from "@/server/db";
import { handleBrokerHealthCheck } from "@/server/jobs/broker-health-check";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

describe("broker-health-check job", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("пишет health-check для всех isActive брокеров", async () => {
    await prisma.broker.createMany({
      data: [
        {
          name: "b-on",
          endpointUrl: "https://example.com/1",
          fieldMapping: {} as object,
          postbackSecret: "s".repeat(32),
          postbackLeadIdPath: "$.id",
          postbackStatusPath: "$.s",
          isActive: true,
        },
        {
          name: "b-off",
          endpointUrl: "https://example.com/2",
          fieldMapping: {} as object,
          postbackSecret: "s".repeat(32),
          postbackLeadIdPath: "$.id",
          postbackStatusPath: "$.s",
          isActive: false,
        },
      ],
    });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await handleBrokerHealthCheck({
      data: {},
      id: "j1",
      name: "broker-health-check",
    } as never);

    expect(spy).toHaveBeenCalledTimes(1);
    const checks = await prisma.brokerHealthCheck.findMany();
    expect(checks).toHaveLength(1);
    const active = await prisma.broker.findFirst({ where: { name: "b-on" } });
    expect(active?.lastHealthStatus).toBe("healthy");
  });
});

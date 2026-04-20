import { recordHealthResult } from "@/server/autologin/proxy/health";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("autologin proxy health recordHealthResult", () => {
  let epId: string;

  beforeEach(async () => {
    await resetDb();
    const ep = await prisma.proxyEndpoint.create({
      data: {
        label: "bd-1",
        provider: "brightdata",
        host: "brd.superproxy.io",
        port: 22225,
        username: "u",
        password: "p",
        country: "US",
      },
    });
    epId = ep.id;
  });

  it("healthy result resets consecutiveFails and sets lastHealthStatus=healthy", async () => {
    // seed some fails
    await prisma.proxyEndpoint.update({
      where: { id: epId },
      data: { consecutiveFails: 2, lastHealthStatus: "degraded" },
    });
    await recordHealthResult(epId, { status: "healthy", latencyMs: 120 });
    const updated = await prisma.proxyEndpoint.findUniqueOrThrow({ where: { id: epId } });
    expect(updated.lastHealthStatus).toBe("healthy");
    expect(updated.consecutiveFails).toBe(0);
    expect(updated.lastLatencyMs).toBe(120);
  });

  it("three consecutive down results escalate to status=down", async () => {
    for (let i = 0; i < 3; i++) {
      await recordHealthResult(epId, {
        status: "down",
        latencyMs: 5000,
        error: "timeout",
      });
    }
    const updated = await prisma.proxyEndpoint.findUniqueOrThrow({ where: { id: epId } });
    expect(updated.lastHealthStatus).toBe("down");
    expect(updated.consecutiveFails).toBe(3);
  });
});

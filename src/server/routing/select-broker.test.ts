import { prisma } from "@/server/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { selectBrokerPool } from "./select-broker";

describe("selectBrokerPool", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns empty when no rules for geo", async () => {
    expect(await selectBrokerPool("UA")).toEqual([]);
  });

  it("returns brokers ordered by priority", async () => {
    const b1 = await prisma.broker.create({ data: brokerFixture("B1") });
    const b2 = await prisma.broker.create({ data: brokerFixture("B2") });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b1.id, priority: 2 } });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b2.id, priority: 1 } });
    const pool = await selectBrokerPool("UA");
    expect(pool.map((b) => b.name)).toEqual(["B2", "B1"]);
  });

  it("skips inactive brokers", async () => {
    const b1 = await prisma.broker.create({ data: { ...brokerFixture("B1"), isActive: false } });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b1.id, priority: 1 } });
    expect(await selectBrokerPool("UA")).toEqual([]);
  });

  it("skips rules with isActive=false", async () => {
    const b1 = await prisma.broker.create({ data: brokerFixture("B1") });
    await prisma.rotationRule.create({
      data: { geo: "UA", brokerId: b1.id, priority: 1, isActive: false },
    });
    expect(await selectBrokerPool("UA")).toEqual([]);
  });
});

function brokerFixture(name: string) {
  return {
    name,
    endpointUrl: "http://mock/push",
    fieldMapping: {},
    postbackSecret: "s",
    postbackLeadIdPath: "id",
    postbackStatusPath: "status",
  };
}

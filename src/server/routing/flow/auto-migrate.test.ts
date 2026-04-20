import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../tests/helpers/db";
import { ensureDefaultFlowsFromRotationRules } from "./auto-migrate";

const brokerSeed = (name: string) => ({
  name,
  endpointUrl: "http://mock",
  fieldMapping: {},
  postbackSecret: "s",
  postbackLeadIdPath: "id",
  postbackStatusPath: "status",
});

describe("auto-migrate RotationRule → Flow", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("создаёт PUBLISHED flow для каждого GEO с rules", async () => {
    const b1 = await prisma.broker.create({ data: brokerSeed("B1") });
    const b2 = await prisma.broker.create({ data: brokerSeed("B2") });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b1.id, priority: 1 } });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b2.id, priority: 2 } });
    await prisma.rotationRule.create({ data: { geo: "PL", brokerId: b1.id, priority: 1 } });

    const created = await ensureDefaultFlowsFromRotationRules();
    expect(created).toBe(2);
    const flows = await prisma.flow.findMany({ where: { status: "PUBLISHED" } });
    expect(flows.map((f) => f.name).sort()).toEqual(["auto:PL", "auto:UA"]);
  });

  it("идемпотентна — повторный запуск не создаёт дублей", async () => {
    const b = await prisma.broker.create({ data: brokerSeed("B") });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b.id, priority: 1 } });
    await ensureDefaultFlowsFromRotationRules();
    const again = await ensureDefaultFlowsFromRotationRules();
    expect(again).toBe(0);
    expect(await prisma.flow.count()).toBe(1);
  });
});

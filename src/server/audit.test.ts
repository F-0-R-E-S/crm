import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../tests/helpers/db";
import { writeAuditLog } from "./audit";
import { prisma } from "./db";

describe("writeAuditLog", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("records action with diff", async () => {
    const user = await prisma.user.create({ data: { email: "a@a.com", passwordHash: "x" } });
    await writeAuditLog({
      userId: user.id,
      action: "broker.update",
      entity: "Broker",
      entityId: "b1",
      diff: { before: { name: "A" }, after: { name: "B" } },
    });
    const row = await prisma.auditLog.findFirst({ where: { userId: user.id } });
    expect(row?.action).toBe("broker.update");
    expect((row?.diff as { after: { name: string } }).after.name).toBe("B");
  });
});

import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function createUserAndSub() {
  const user = await prisma.user.create({
    data: { email: `u${Date.now()}@t.local`, passwordHash: "x", role: "OPERATOR" },
  });
  const sub = await prisma.telegramSubscription.create({
    data: { userId: user.id, chatId: "1001", isActive: true },
  });
  return { user, sub };
}

describe("telegram subscription state transitions", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("subscribing to NEW_LEAD twice is idempotent (single occurrence)", async () => {
    const { sub } = await createUserAndSub();
    // simulate the /sub command dedup behavior
    const after1 = Array.from(new Set([...sub.eventTypes, "NEW_LEAD"]));
    await prisma.telegramSubscription.update({
      where: { id: sub.id },
      data: { eventTypes: after1 },
    });
    const reload1 = await prisma.telegramSubscription.findUnique({ where: { id: sub.id } });
    const after2 = Array.from(new Set([...(reload1?.eventTypes ?? []), "NEW_LEAD"]));
    await prisma.telegramSubscription.update({
      where: { id: sub.id },
      data: { eventTypes: after2 },
    });
    const final = await prisma.telegramSubscription.findUnique({ where: { id: sub.id } });
    expect(final?.eventTypes).toEqual(["NEW_LEAD"]);
  });

  it("unsubscribing removes the value", async () => {
    const { sub } = await createUserAndSub();
    await prisma.telegramSubscription.update({
      where: { id: sub.id },
      data: { eventTypes: ["NEW_LEAD", "FTD"] },
    });
    const reload = await prisma.telegramSubscription.findUnique({ where: { id: sub.id } });
    const without = (reload?.eventTypes ?? []).filter((v) => v !== "NEW_LEAD");
    await prisma.telegramSubscription.update({
      where: { id: sub.id },
      data: { eventTypes: without },
    });
    const final = await prisma.telegramSubscription.findUnique({ where: { id: sub.id } });
    expect(final?.eventTypes).toEqual(["FTD"]);
  });
});

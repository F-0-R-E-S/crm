import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

const sendMock = vi.fn().mockResolvedValue("job-id");
vi.mock("@/server/jobs/queue", async (orig) => {
  const actual = (await orig()) as typeof import("@/server/jobs/queue");
  return {
    ...actual,
    startBossOnce: async () => ({ send: sendMock }),
    getBoss: () => ({ send: sendMock }),
  };
});

// Import after mock
const { emitTelegramEvent } = await import("@/server/telegram/emit");

async function createUser(email: string) {
  return prisma.user.create({ data: { email, passwordHash: "x", role: "OPERATOR" } });
}

describe("emitTelegramEvent — matching rules", () => {
  beforeEach(async () => {
    await resetDb();
    sendMock.mockClear();
  });

  it("routes only to subscribers listening for the event type", async () => {
    const u1 = await createUser("u1@t.local");
    const u2 = await createUser("u2@t.local");
    await prisma.telegramSubscription.create({
      data: { userId: u1.id, chatId: "c1", isActive: true, eventTypes: ["NEW_LEAD"] },
    });
    await prisma.telegramSubscription.create({
      data: { userId: u2.id, chatId: "c2", isActive: true, eventTypes: ["FTD"] },
    });
    const n = await emitTelegramEvent("NEW_LEAD", { leadId: "x" });
    expect(n).toBe(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("brokerFilter excludes non-matching broker", async () => {
    const u = await createUser("ub@t.local");
    await prisma.telegramSubscription.create({
      data: { userId: u.id, chatId: "c1", isActive: true, brokerFilter: ["B1"] },
    });
    const n = await emitTelegramEvent("PUSHED", { leadId: "x" }, { brokerId: "B2" });
    expect(n).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("brokerFilter matches when broker is in list", async () => {
    const u = await createUser("ub2@t.local");
    await prisma.telegramSubscription.create({
      data: { userId: u.id, chatId: "c1", isActive: true, brokerFilter: ["B1"] },
    });
    const n = await emitTelegramEvent("PUSHED", { leadId: "x" }, { brokerId: "B1" });
    expect(n).toBe(1);
  });

  it("mutedBrokerIds wins over brokerFilter", async () => {
    const u = await createUser("um@t.local");
    await prisma.telegramSubscription.create({
      data: {
        userId: u.id,
        chatId: "c1",
        isActive: true,
        brokerFilter: ["B1"],
        mutedBrokerIds: ["B1"],
      },
    });
    const n = await emitTelegramEvent("PUSHED", { leadId: "x" }, { brokerId: "B1" });
    expect(n).toBe(0);
  });
});

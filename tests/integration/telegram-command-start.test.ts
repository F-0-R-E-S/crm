import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { consumeLinkToken, issueLinkToken } from "@/server/telegram/link-token";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function createUser(email = "user@test.local") {
  return prisma.user.create({
    data: { email, passwordHash: "x", role: "ADMIN" },
  });
}

describe("telegram link-token flow", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("issue + consume → active subscription with telegramUserId", async () => {
    const user = await createUser();
    const token = await issueLinkToken(user.id);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);

    const res = await consumeLinkToken(token, "42", "tg-7");
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.userId).toBe(user.id);

    const active = await prisma.telegramSubscription.findUnique({
      where: { userId_chatId: { userId: user.id, chatId: "42" } },
    });
    expect(active).not.toBeNull();
    expect(active?.isActive).toBe(true);
    expect(active?.telegramUserId).toBe("tg-7");
    expect(active?.linkTokenHash).toBeNull();

    const pending = await prisma.telegramSubscription.findFirst({
      where: { chatId: { startsWith: "pending:" } },
    });
    expect(pending).toBeNull();
  });

  it("wrong token → ok:false, token_not_found", async () => {
    const user = await createUser();
    await issueLinkToken(user.id);
    const res = await consumeLinkToken("not-a-real-token", "42", "tg-7");
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected not ok");
    expect(res.reason).toBe("token_not_found");
  });

  it("expired token → ok:false, token_expired", async () => {
    const user = await createUser();
    const token = await issueLinkToken(user.id);
    // force expiry
    await prisma.telegramSubscription.updateMany({
      where: { linkTokenHash: sha256(token) },
      data: { linkTokenExpires: new Date(Date.now() - 60_000) },
    });
    const res = await consumeLinkToken(token, "42", "tg-7");
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected not ok");
    expect(res.reason).toBe("token_expired");
  });
});

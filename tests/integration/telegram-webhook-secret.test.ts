import { POST } from "@/app/api/telegram/webhook/[secret]/route";
import { prisma } from "@/server/db";
import { resetBotCache } from "@/server/telegram/bot";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

function fakeUpdate() {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 42, type: "private" },
      from: { id: 7, is_bot: false, first_name: "T" },
      text: "/ping",
    },
  };
}

function post(secret: string, body: object) {
  return POST(
    new Request(`http://localhost:3000/api/telegram/webhook/${secret}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ secret }) },
  );
}

describe("telegram webhook secret path", () => {
  beforeEach(async () => {
    await resetDb();
    resetBotCache();
  });

  it("returns 404 when no config exists", async () => {
    const res = await post("any", fakeUpdate());
    expect(res.status).toBe(404);
  });

  it("returns 404 when secret mismatches", async () => {
    await prisma.telegramBotConfig.create({
      data: { botToken: "123456:FAKE", webhookSecret: "correct-secret" },
    });
    const res = await post("wrong-secret", fakeUpdate());
    expect(res.status).toBe(404);
  });

  it("accepts (200) when secret matches", async () => {
    await prisma.telegramBotConfig.create({
      data: { botToken: "123456:FAKE_TOKEN_STRING", webhookSecret: "the-right-secret" },
    });
    const res = await post("the-right-secret", fakeUpdate());
    // grammy may internally fail on the fake token, but webhook should still 200-ack.
    expect(res.status).toBe(200);
  });
});

import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { checkBlacklists } from "./blacklist";

describe("checkBlacklists", () => {
  beforeEach(async () => {
    await prisma.blacklist.deleteMany({});
  });

  it("blocks IP exact match", async () => {
    await prisma.blacklist.create({ data: { kind: "IP_EXACT", value: "1.2.3.4" } });
    const res = await checkBlacklists({ ip: "1.2.3.4", email: null, phoneE164: null });
    expect(res).toBe("ip_blocked");
  });

  it("blocks IP in CIDR", async () => {
    await prisma.blacklist.create({ data: { kind: "IP_CIDR", value: "10.0.0.0/8" } });
    const res = await checkBlacklists({ ip: "10.5.5.5", email: null, phoneE164: null });
    expect(res).toBe("ip_blocked");
  });

  it("blocks email domain", async () => {
    await prisma.blacklist.create({ data: { kind: "EMAIL_DOMAIN", value: "mailinator.com" } });
    const res = await checkBlacklists({
      ip: "8.8.8.8",
      email: "x@mailinator.com",
      phoneE164: null,
    });
    expect(res).toBe("email_domain_blocked");
  });

  it("blocks phone E.164", async () => {
    await prisma.blacklist.create({ data: { kind: "PHONE_E164", value: "+380671234567" } });
    const res = await checkBlacklists({ ip: "8.8.8.8", email: null, phoneE164: "+380671234567" });
    expect(res).toBe("phone_blocked");
  });

  it("returns null for clean input", async () => {
    expect(
      await checkBlacklists({ ip: "8.8.8.8", email: "ok@ok.com", phoneE164: "+380671234567" }),
    ).toBeNull();
  });
});

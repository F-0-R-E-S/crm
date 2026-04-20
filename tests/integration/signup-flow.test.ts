import { prisma } from "@/server/db";
import { createAccount } from "@/server/onboarding/signup";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

describe("createAccount", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates Org + User + OnboardingProgress and starts a 14-day trial", async () => {
    const now = new Date("2026-04-20T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const { userId, orgId } = await createAccount({
      email: "founder@acme.io",
      password: "testpass1234",
      orgName: "Acme",
    });

    expect(userId).toBeDefined();
    expect(orgId).toBeDefined();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.role).toBe("ADMIN");
    expect(user?.orgId).toBe(orgId);
    expect(user?.emailVerifiedAt).toBeNull();
    expect(await bcrypt.compare("testpass1234", user!.passwordHash)).toBe(true);

    const org = await prisma.org.findUnique({ where: { id: orgId } });
    expect(org?.plan).toBe("TRIAL");
    expect(org?.trialStartedAt?.toISOString()).toBe(now.toISOString());
    const expectedEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    expect(org?.trialEndsAt?.toISOString()).toBe(expectedEnd.toISOString());

    const progress = await prisma.onboardingProgress.findUnique({ where: { orgId } });
    expect(progress?.currentStep).toBe(1);
  });

  it("rejects duplicate email", async () => {
    await createAccount({
      email: "dup@x.io",
      password: "testpass1234",
      orgName: "First",
    });
    await expect(
      createAccount({ email: "dup@x.io", password: "testpass1234", orgName: "Second" }),
    ).rejects.toThrow(/already.*exists|duplicate/i);
  });

  it("slugifies duplicate org names with suffix", async () => {
    const { orgId: first } = await createAccount({
      email: "a1@x.io",
      password: "testpass1234",
      orgName: "Acme",
    });
    const { orgId: second } = await createAccount({
      email: "a2@x.io",
      password: "testpass1234",
      orgName: "Acme",
    });
    const o1 = await prisma.org.findUnique({ where: { id: first } });
    const o2 = await prisma.org.findUnique({ where: { id: second } });
    expect(o1?.slug).toBe("acme");
    expect(o2?.slug).toMatch(/^acme-[a-z0-9]{4,}$/);
  });
});

import {
  __setCaptchaSolverForTests,
  StubCaptchaSolver,
} from "@/server/autologin/captcha-solver";
import { runAutologinAttempt } from "@/server/autologin/run-attempt";
import { prisma } from "@/server/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

// Mock playwright. We return a fake chromium that yields a page whose
// interaction methods are no-ops except for evaluate, which returns our
// configured session value when inspecting __SESSION__.
let mockSessionValue: string | null = "sess-xyz";

vi.mock("playwright", () => {
  const pageFor = (): unknown => ({
    goto: async () => {},
    getAttribute: async (_sel: string, attr: string) =>
      attr === "data-captcha-site-key" ? "sk-fake" : null,
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    evaluate: async (fn: any) => {
      const src = typeof fn === "function" ? fn.toString() : String(fn);
      if (src.includes("__SESSION__")) return mockSessionValue;
      return undefined;
    },
    fill: async () => {},
    click: async () => {},
    waitForLoadState: async () => {},
    url: () => "http://mock/login",
  });
  const contextFor = () => ({
    newPage: async () => pageFor(),
    close: async () => {},
  });
  const browserFor = () => ({
    newContext: async () => contextFor(),
    close: async () => {},
  });
  return {
    chromium: {
      launch: async () => browserFor(),
    },
  };
});

describe("runAutologinAttempt 4-stage state machine", () => {
  let leadId: string;
  let brokerId: string;

  beforeEach(async () => {
    await resetDb();
    mockSessionValue = "sess-xyz";
    __setCaptchaSolverForTests(new StubCaptchaSolver());
    const affiliate = await prisma.affiliate.create({
      data: { name: "aff-autologin" },
    });
    const broker = await prisma.broker.create({
      data: {
        name: "b-autologin",
        endpointUrl: "https://example.com/push",
        fieldMapping: {} as object,
        postbackSecret: "s".repeat(32),
        postbackLeadIdPath: "$.id",
        postbackStatusPath: "$.s",
        autologinEnabled: true,
        autologinLoginUrl: "http://mock/login",
      },
    });
    brokerId = broker.id;
    const lead = await prisma.lead.create({
      data: {
        affiliateId: affiliate.id,
        brokerId: broker.id,
        geo: "US",
        ip: "1.2.3.4",
        eventTs: new Date(),
        email: "x@y.com",
        traceId: `tr-${Date.now()}`,
      },
    });
    leadId = lead.id;
  });

  afterEach(() => {
    __setCaptchaSolverForTests(null);
  });

  it("happy path — transitions to SESSION_READY and persists sessionTokenRef", async () => {
    mockSessionValue = "sess-xyz";
    const out = await runAutologinAttempt({
      leadId,
      brokerId,
      adapterId: "mock",
      loginUrl: "http://mock/login",
      credentials: { username: "u", password: "p" },
    });
    expect(out.status).toBe("SUCCEEDED");
    expect(out.stageReached).toBe("SESSION_READY");
    const attempt = await prisma.autologinAttempt.findUniqueOrThrow({
      where: { id: out.attemptId },
    });
    expect(attempt.sessionTokenRef).toBe("sess-xyz");
    expect(attempt.captchaUsed).toBe(true);
    expect(attempt.status).toBe("SUCCEEDED");
    expect(attempt.stage).toBe("SESSION_READY");
  });

  it("captcha failure — records FAILED at stage=CAPTCHA", async () => {
    __setCaptchaSolverForTests({
      name: "throwing",
      async solve() {
        throw new Error("rate_limit");
      },
    });
    const out = await runAutologinAttempt({
      leadId,
      brokerId,
      adapterId: "mock",
      loginUrl: "http://mock/login",
      credentials: { username: "u", password: "p" },
    });
    expect(out.status).toBe("FAILED");
    expect(out.stageReached).toBe("CAPTCHA");
    const attempt = await prisma.autologinAttempt.findUniqueOrThrow({
      where: { id: out.attemptId },
    });
    expect(attempt.status).toBe("FAILED");
    expect(attempt.errorStage).toBe("CAPTCHA");
    expect(attempt.errorMessage).toContain("rate_limit");
  });
});

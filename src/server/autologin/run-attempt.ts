import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { logger } from "@/server/observability";
import type { AutologinStage } from "@prisma/client";
import { type Browser, type BrowserContext, chromium } from "playwright";
import { getAdapter } from "./adapters/registry";
import { getCaptchaSolver } from "./captcha-solver";
import { pickProxy, toProxyUrl } from "./proxy/pool";

const NAV_TIMEOUT_MS = 15_000;

export interface RunAttemptInput {
  leadId: string;
  brokerId: string;
  adapterId: string;
  loginUrl: string;
  credentials: { username: string; password: string };
}

export interface RunAttemptOutput {
  attemptId: string;
  status: "SUCCEEDED" | "FAILED";
  stageReached: AutologinStage;
  durationMs: number;
}

export async function runAutologinAttempt(input: RunAttemptInput): Promise<RunAttemptOutput> {
  const adapter = getAdapter(input.adapterId);
  if (!adapter) throw new Error(`unknown_adapter:${input.adapterId}`);
  const proxy = await pickProxy();
  const attempt = await prisma.autologinAttempt.create({
    data: {
      leadId: input.leadId,
      brokerId: input.brokerId,
      proxyEndpointId: proxy?.id ?? null,
      stage: "INITIATING",
      status: "RUNNING",
    },
  });
  const startedAt = Date.now();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  const fail = async (stage: AutologinStage, error: string): Promise<RunAttemptOutput> => {
    const durationMs = Date.now() - startedAt;
    await prisma.autologinAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        stage,
        errorStage: stage,
        errorMessage: error.slice(0, 500),
        completedAt: new Date(),
        durationMs,
      },
    });
    await writeLeadEvent(input.leadId, "STATE_TRANSITION", {
      kind: "autologin_failed",
      stage,
      error,
      attemptId: attempt.id,
    });
    try {
      await context?.close();
      await browser?.close();
    } catch {
      /* ignore */
    }
    return { attemptId: attempt.id, status: "FAILED", stageReached: stage, durationMs };
  };

  try {
    browser = await chromium.launch({
      headless: true,
      proxy: proxy ? { server: toProxyUrl(proxy) } : undefined,
    });
    context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(input.loginUrl, {
        timeout: NAV_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });
    } catch (err) {
      return await fail("INITIATING", err instanceof Error ? err.message : "nav_failed");
    }
    await prisma.autologinAttempt.update({
      where: { id: attempt.id },
      data: { stage: "CAPTCHA" },
    });
    const outcome = await adapter.execute({
      page,
      loginUrl: input.loginUrl,
      username: input.credentials.username,
      password: input.credentials.password,
      solveCaptcha: (k, u) => getCaptchaSolver().solve(k, u),
      log: (msg, extra) =>
        logger.info({ attemptId: attempt.id, msg, ...extra }, "autologin"),
    });
    if (!outcome.ok) return await fail(outcome.stageFailed, outcome.error);
    const durationMs = Date.now() - startedAt;
    await prisma.autologinAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "SUCCEEDED",
        stage: "SESSION_READY",
        completedAt: new Date(),
        durationMs,
        sessionTokenRef: outcome.sessionRef,
        captchaUsed: adapter.needsCaptcha,
      },
    });
    await writeLeadEvent(input.leadId, "STATE_TRANSITION", {
      kind: "autologin_succeeded",
      attemptId: attempt.id,
      durationMs,
    });
    await context.close();
    await browser.close();
    return {
      attemptId: attempt.id,
      status: "SUCCEEDED",
      stageReached: "SESSION_READY",
      durationMs,
    };
  } catch (err) {
    return await fail(
      "AUTHENTICATING",
      err instanceof Error ? err.message : "unexpected_error",
    );
  }
}

import type { AdapterContext, AdapterOutcome, BrokerLoginAdapter } from "./base";

export const mockAdapter: BrokerLoginAdapter = {
  id: "mock",
  needsCaptcha: true,
  async execute(ctx: AdapterContext): Promise<AdapterOutcome> {
    const { page, username, password, solveCaptcha, log } = ctx;
    try {
      const siteKey = await page.getAttribute("form", "data-captcha-site-key");
      if (siteKey) {
        log("captcha_solve_start", { siteKey });
        const token = await solveCaptcha(siteKey, page.url());
        await page.evaluate((t) => {
          const i = document.createElement("input");
          i.name = "captcha_token";
          i.value = t;
          i.hidden = true;
          document.querySelector("form")?.appendChild(i);
        }, token);
      }
    } catch (err) {
      return {
        ok: false,
        stageFailed: "CAPTCHA",
        error: err instanceof Error ? err.message : "captcha_error",
      };
    }
    try {
      await page.fill("#username", username);
      await page.fill("#password", password);
      await Promise.all([
        page.waitForLoadState("networkidle", { timeout: 10_000 }),
        page.click("button[type=submit]"),
      ]);
      const sessionRef = await page.evaluate(
        () => (window as unknown as { __SESSION__?: string }).__SESSION__ ?? null,
      );
      if (!sessionRef) {
        return {
          ok: false,
          stageFailed: "AUTHENTICATING",
          error: "no_session_on_document",
        };
      }
      return { ok: true, sessionRef };
    } catch (err) {
      return {
        ok: false,
        stageFailed: "AUTHENTICATING",
        error: err instanceof Error ? err.message : "auth_error",
      };
    }
  },
};

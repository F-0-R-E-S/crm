import { mockAdapter } from "@/server/autologin/adapters/mock";
import { StubCaptchaSolver } from "@/server/autologin/captcha-solver";
import type { Page } from "playwright";
import { describe, expect, it } from "vitest";

type FakePageState = {
  filled: Record<string, string>;
  clicked: string[];
  sessionValue: string | null;
};

function fakePage(sessionValue: string | null): { page: Page; state: FakePageState } {
  const state: FakePageState = { filled: {}, clicked: [], sessionValue };
  const page = {
    getAttribute: async (_sel: string, attr: string) => {
      if (attr === "data-captcha-site-key") return "sk-test";
      return null;
    },
    // biome-ignore lint/suspicious/noExplicitAny: test double
    evaluate: async (fn: any, _arg?: unknown) => {
      const src = typeof fn === "function" ? fn.toString() : String(fn);
      if (src.includes("__SESSION__")) return state.sessionValue;
      // captcha form-append branch: no-op
      return undefined;
    },
    fill: async (sel: string, val: string) => {
      state.filled[sel] = val;
    },
    click: async (sel: string) => {
      state.clicked.push(sel);
    },
    waitForLoadState: async (_s: string, _o?: unknown) => {},
    url: () => "http://mock/login",
  } as unknown as Page;
  return { page, state };
}

describe("mockAdapter.execute", () => {
  it("happy path — returns session ref and fills credentials", async () => {
    const { page, state } = fakePage("sess-abc");
    const stub = new StubCaptchaSolver();
    const out = await mockAdapter.execute({
      page,
      loginUrl: "http://mock/login",
      username: "u",
      password: "p",
      solveCaptcha: stub.solve.bind(stub),
      log: () => {},
    });
    expect(out).toEqual({ ok: true, sessionRef: "sess-abc" });
    expect(state.filled["#username"]).toBe("u");
    expect(state.filled["#password"]).toBe("p");
  });

  it("CAPTCHA failure — returns stageFailed=CAPTCHA with solver error", async () => {
    const { page } = fakePage("sess-abc");
    const out = await mockAdapter.execute({
      page,
      loginUrl: "http://mock/login",
      username: "u",
      password: "p",
      solveCaptcha: async () => {
        throw new Error("rate_limited");
      },
      log: () => {},
    });
    expect(out).toEqual({
      ok: false,
      stageFailed: "CAPTCHA",
      error: "rate_limited",
    });
  });

  it("AUTHENTICATING failure — no session token on document", async () => {
    const { page } = fakePage(null);
    const stub = new StubCaptchaSolver();
    const out = await mockAdapter.execute({
      page,
      loginUrl: "http://mock/login",
      username: "u",
      password: "p",
      solveCaptcha: stub.solve.bind(stub),
      log: () => {},
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.stageFailed).toBe("AUTHENTICATING");
    }
  });
});

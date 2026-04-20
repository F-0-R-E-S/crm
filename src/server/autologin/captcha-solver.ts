export interface CaptchaSolver {
  readonly name: string;
  solve(siteKey: string, url: string): Promise<string>;
}

export class StubCaptchaSolver implements CaptchaSolver {
  readonly name = "stub";
  async solve(): Promise<string> {
    await new Promise((r) => setTimeout(r, 50));
    return "test-captcha-token";
  }
}

let singleton: CaptchaSolver | null = null;

export function getCaptchaSolver(): CaptchaSolver {
  if (!singleton) singleton = new StubCaptchaSolver();
  return singleton;
}

export function __setCaptchaSolverForTests(s: CaptchaSolver | null) {
  singleton = s;
}

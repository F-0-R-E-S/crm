import type { Page } from "playwright";

export type AdapterContext = {
  page: Page;
  loginUrl: string;
  username: string;
  password: string;
  solveCaptcha: (siteKey: string, url: string) => Promise<string>;
  log: (msg: string, extra?: Record<string, unknown>) => void;
};

export type AdapterOutcome =
  | { ok: true; sessionRef: string }
  | { ok: false; stageFailed: "CAPTCHA" | "AUTHENTICATING"; error: string };

export interface BrokerLoginAdapter {
  readonly id: string; // matches Broker.template.slug or "mock"
  readonly needsCaptcha: boolean;
  execute(ctx: AdapterContext): Promise<AdapterOutcome>;
}

import { extractEnv } from "@/../scripts/docs-regen/extractors/env";
import { describe, expect, it } from "vitest";

describe("env extractor", () => {
  it("parses src/lib/env.ts and returns one section per var tagged to its block", async () => {
    const map = await extractEnv({ envFilePath: "src/lib/env.ts" });
    const billing = map.get("billing-subscription") ?? [];
    expect(billing.some((s) => s.heading === "STRIPE_SECRET_KEY")).toBe(true);
    expect(billing.some((s) => s.heading === "STRIPE_WEBHOOK_SECRET")).toBe(true);

    const tg = map.get("telegram-bot") ?? [];
    expect(tg.some((s) => s.heading === "TELEGRAM_WEBHOOK_BASE_URL")).toBe(true);
  });

  it("vars without a block stay under __shared__", async () => {
    const map = await extractEnv({ envFilePath: "src/lib/env.ts" });
    const shared = map.get("__shared__") ?? [];
    expect(shared.some((s) => s.heading === "DATABASE_URL")).toBe(true);
  });
});

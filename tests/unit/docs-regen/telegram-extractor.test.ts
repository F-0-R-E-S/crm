import { extractTelegram } from "@/../scripts/docs-regen/extractors/telegram";
import { describe, expect, it } from "vitest";

describe("telegram extractor", () => {
  it("lists every TelegramEventType under telegram-bot block", async () => {
    const map = await extractTelegram({
      catalogPath: "src/server/telegram/event-catalog.ts",
      templatesDir: "src/server/telegram/templates",
    });
    const tg = map.get("telegram-bot") ?? [];
    expect(tg.some((s) => s.heading === "NEW_LEAD")).toBe(true);
    expect(tg.some((s) => s.heading === "FTD")).toBe(true);
    expect(tg.some((s) => s.heading === "SUBSCRIPTION_CREATED")).toBe(true);
    expect(tg.length).toBeGreaterThanOrEqual(23);
  });

  it("links each event to its template file", async () => {
    const map = await extractTelegram({
      catalogPath: "src/server/telegram/event-catalog.ts",
      templatesDir: "src/server/telegram/templates",
    });
    const ftd = (map.get("telegram-bot") ?? []).find((s) => s.heading === "FTD");
    expect(ftd).toBeDefined();
    expect(ftd!.body).toMatch(/templates\/ftd\.ts/);
  });
});

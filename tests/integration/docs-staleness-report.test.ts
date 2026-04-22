import { prisma } from "@/server/db";
import { handleDocsStalenessReport } from "@/server/jobs/docs-staleness-report";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the telegram emitter
vi.mock("@/server/telegram/emit", () => ({
  emitTelegramEvent: vi.fn().mockResolvedValue(undefined),
}));

import { emitTelegramEvent } from "@/server/telegram/emit";

describe("docs-staleness-report job", () => {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "DocAskEvent" CASCADE`;
    vi.clearAllMocks();
  });

  it("no-ops when no refusals in the last 7 days", async () => {
    await handleDocsStalenessReport();
    expect(emitTelegramEvent).not.toHaveBeenCalled();
  });

  it("emits DOCS_STALENESS_REPORT with top refusals", async () => {
    const now = new Date();
    for (const q of ["What is quantum?", "What is quantum?", "Tell me about X"]) {
      await prisma.docAskEvent.create({
        data: {
          question: q,
          answer: "I don't have enough context",
          hitsJson: [],
          latencyMs: 100,
          refused: true,
          promptVer: "v1",
          modelName: "qwen3",
          createdAt: now,
        },
      });
    }
    await handleDocsStalenessReport();
    expect(emitTelegramEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = (emitTelegramEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(eventType).toBe("DOCS_STALENESS_REPORT");
    expect(payload.windowDays).toBe(7);
    expect(payload.topRefusedQuestions[0].q).toBe("What is quantum?");
    expect(payload.topRefusedQuestions[0].count).toBe(2);
  });
});

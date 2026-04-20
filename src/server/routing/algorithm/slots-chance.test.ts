import { describe, expect, it } from "vitest";
import {
  selectBySlotsOrChance,
  validateChanceSum,
  validateSlotBounds,
} from "./slots-chance";

describe("slots-chance", () => {
  it("validateChanceSum — сумма != 100% → error", () => {
    const r = validateChanceSum([
      { id: "a", chance: 40 },
      { id: "b", chance: 40 },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("invalid_probability_sum");
  });

  it("validateChanceSum — допускает ±0.01", () => {
    const r = validateChanceSum([
      { id: "a", chance: 33.33 },
      { id: "b", chance: 33.33 },
      { id: "c", chance: 33.34 },
    ]);
    expect(r.ok).toBe(true);
  });

  it("validateSlotBounds — 0 или >10000 → error", () => {
    expect(validateSlotBounds([{ id: "a", slots: 0 }]).ok).toBe(false);
    expect(validateSlotBounds([{ id: "a", slots: 10_001 }]).ok).toBe(false);
    expect(validateSlotBounds([{ id: "a", slots: 100 }]).ok).toBe(true);
  });

  it("select возвращает один из targets", async () => {
    const r = await selectBySlotsOrChance([
      { id: "a", chance: 50 },
      { id: "b", chance: 50 },
    ]);
    expect(["a", "b"]).toContain(r.id);
    expect(r.traceToken).toMatch(/^slots-chance:[0-9a-f]{32}$/);
  });

  it("statistical ±3% on 20k iterations 70/20/10", async () => {
    const targets = [
      { id: "a", chance: 70 },
      { id: "b", chance: 20 },
      { id: "c", chance: 10 },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 20_000; i++) {
      const r = await selectBySlotsOrChance(targets);
      counts[r.id] += 1;
    }
    expect(Math.abs(counts.a / 20_000 - 0.7)).toBeLessThan(0.03);
    expect(Math.abs(counts.b / 20_000 - 0.2)).toBeLessThan(0.03);
    expect(Math.abs(counts.c / 20_000 - 0.1)).toBeLessThan(0.03);
  }, 30_000);
});

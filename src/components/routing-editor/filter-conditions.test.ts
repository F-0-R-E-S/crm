import { describe, expect, it } from "vitest";
import {
  type FilterCondition,
  coerceValue,
  defaultValueFor,
  legalOpsForField,
  parseChips,
  validateCondition,
  validateConditions,
} from "./filter-conditions";

describe("filter-conditions matrix", () => {
  it("exposes every op for free-text fields", () => {
    expect(legalOpsForField("subId")).toEqual(["eq", "neq", "in", "not_in", "matches"]);
    expect(legalOpsForField("utm_source")).toEqual(["eq", "neq", "in", "not_in", "matches"]);
  });

  it("restricts timeOfDay to set-like ops", () => {
    expect(legalOpsForField("timeOfDay")).toEqual(["eq", "in", "not_in"]);
  });

  it("restricts affiliateId: no regex", () => {
    expect(legalOpsForField("affiliateId")).toEqual(["eq", "neq", "in", "not_in"]);
  });

  it("allows regex for geo (subregion coding)", () => {
    expect(legalOpsForField("geo")).toContain("matches");
  });
});

describe("filter-conditions default values", () => {
  it("hands scalar ops empty strings", () => {
    expect(defaultValueFor("geo", "eq")).toBe("");
    expect(defaultValueFor("subId", "matches")).toBe("");
  });

  it("hands set ops empty arrays", () => {
    expect(defaultValueFor("geo", "in")).toEqual([]);
    expect(defaultValueFor("affiliateId", "not_in")).toEqual([]);
  });

  it("seeds timeOfDay eq with a wide-open range", () => {
    expect(defaultValueFor("timeOfDay", "eq")).toBe("00:00-24:00");
  });
});

describe("filter-conditions coerceValue", () => {
  it("promotes scalar → array when op flips to `in`", () => {
    expect(coerceValue("UA", "eq", "in", "geo")).toEqual(["UA"]);
  });

  it("drops to first array element when flipping `in` → `eq`", () => {
    expect(coerceValue(["UA", "PL"], "in", "eq", "geo")).toBe("UA");
  });

  it("keeps an array stable across `in` ↔ `not_in`", () => {
    expect(coerceValue(["UA", "PL"], "in", "not_in", "geo")).toEqual(["UA", "PL"]);
  });

  it("hands an empty array for empty scalar promoted to `in`", () => {
    expect(coerceValue("", "eq", "in", "geo")).toEqual([]);
  });

  it("stringifies a numeric value when flipping to scalar op", () => {
    expect(coerceValue(42, "eq", "eq", "subId")).toBe("42");
  });
});

describe("filter-conditions validateCondition", () => {
  it("accepts a well-formed `in` row", () => {
    const row: FilterCondition = { field: "geo", op: "in", value: ["UA", "PL"] };
    expect(validateCondition(row).ok).toBe(true);
  });

  it("rejects an unknown field", () => {
    const row = { field: "bogus", op: "eq", value: "x" } as unknown as FilterCondition;
    expect(validateCondition(row).ok).toBe(false);
  });

  it("rejects an unknown op", () => {
    const row = { field: "geo", op: "hash", value: "x" } as unknown as FilterCondition;
    expect(validateCondition(row).ok).toBe(false);
  });
});

describe("filter-conditions validateConditions list", () => {
  it("rejects an empty list outright", () => {
    const r = validateConditions([]);
    expect(r.ok).toBe(false);
  });

  it("reports index of the first invalid row", () => {
    const rows = [
      { field: "geo", op: "eq", value: "UA" },
      { field: "bogus", op: "eq", value: "x" },
    ] as unknown as FilterCondition[];
    const r = validateConditions(rows);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.index).toBe(1);
      expect(typeof r.error).toBe("string");
    }
  });

  it("accepts a multi-row list with mixed ops", () => {
    const rows: FilterCondition[] = [
      { field: "geo", op: "in", value: ["UA", "PL"] },
      { field: "utm_source", op: "matches", value: "^google" },
    ];
    expect(validateConditions(rows).ok).toBe(true);
  });
});

describe("filter-conditions parseChips", () => {
  it("splits on commas", () => {
    expect(parseChips("UA, PL, DE")).toEqual(["UA", "PL", "DE"]);
  });

  it("splits on newlines", () => {
    expect(parseChips("UA\nPL\nDE")).toEqual(["UA", "PL", "DE"]);
  });

  it("trims, drops empties, de-duplicates preserving order", () => {
    expect(parseChips(" UA , UA , PL ,  ,DE,PL")).toEqual(["UA", "PL", "DE"]);
  });
});

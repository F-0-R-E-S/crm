import { describe, expect, it } from "vitest";
import type { LeadSnapshot } from "../engine";
import type { PqlRule } from "../flow/model";
import { evaluatePqlGate } from "./evaluate";
import { PQL_FIELDS, isLegalSign } from "./fields";

const baseLead: LeadSnapshot = {
  id: "L1",
  affiliateId: "aff_1",
  geo: "UA",
  subId: "sub_alpha",
  utm: { source: "google", medium: "cpc" },
  // phone is optional on LeadSnapshot; stored here for extract tests
  // (cast at call site)
  ...({ phone: "+380501234567" } as unknown as Partial<LeadSnapshot>),
};

const fixedNow = new Date("2026-04-22T14:30:00Z"); // UTC hour 14, minute 30

function gate(rules: PqlRule[], logic: "AND" | "OR" = "AND") {
  return evaluatePqlGate(rules, logic, baseLead, fixedNow);
}

describe("PQL evaluate — geo", () => {
  it("eq hit", () => {
    expect(gate([{ field: "geo", sign: "eq", value: "UA", caseSensitive: false }]).ok).toBe(true);
  });
  it("eq miss", () => {
    expect(gate([{ field: "geo", sign: "eq", value: "PL", caseSensitive: false }]).ok).toBe(false);
  });
  it("neq", () => {
    expect(gate([{ field: "geo", sign: "neq", value: "PL", caseSensitive: false }]).ok).toBe(true);
  });
  it("in", () => {
    expect(gate([{ field: "geo", sign: "in", value: ["UA", "PL"], caseSensitive: false }]).ok).toBe(
      true,
    );
  });
  it("not_in", () => {
    expect(
      gate([{ field: "geo", sign: "not_in", value: ["US", "BR"], caseSensitive: false }]).ok,
    ).toBe(true);
  });
  it("matches regex", () => {
    expect(gate([{ field: "geo", sign: "matches", value: "^U", caseSensitive: false }]).ok).toBe(
      true,
    );
  });
});

describe("PQL evaluate — case sensitivity", () => {
  it("case-insensitive eq hits mixed case", () => {
    expect(gate([{ field: "geo", sign: "eq", value: "ua", caseSensitive: false }]).ok).toBe(true);
  });
  it("case-sensitive eq misses mixed case", () => {
    expect(gate([{ field: "geo", sign: "eq", value: "ua", caseSensitive: true }]).ok).toBe(false);
  });
  it("case-sensitive matches uses the i flag only when false", () => {
    expect(gate([{ field: "geo", sign: "matches", value: "ua", caseSensitive: true }]).ok).toBe(
      false,
    );
    expect(gate([{ field: "geo", sign: "matches", value: "ua", caseSensitive: false }]).ok).toBe(
      true,
    );
  });
});

describe("PQL evaluate — numeric hourOfDay", () => {
  it("gte true", () => {
    expect(gate([{ field: "hourOfDay", sign: "gte", value: 10, caseSensitive: false }]).ok).toBe(
      true,
    );
  });
  it("gte false", () => {
    expect(gate([{ field: "hourOfDay", sign: "gte", value: 20, caseSensitive: false }]).ok).toBe(
      false,
    );
  });
  it("lte true", () => {
    expect(gate([{ field: "hourOfDay", sign: "lte", value: 15, caseSensitive: false }]).ok).toBe(
      true,
    );
  });
  it("lte false", () => {
    expect(gate([{ field: "hourOfDay", sign: "lte", value: 10, caseSensitive: false }]).ok).toBe(
      false,
    );
  });
  it("eq / neq", () => {
    expect(gate([{ field: "hourOfDay", sign: "eq", value: 14, caseSensitive: false }]).ok).toBe(
      true,
    );
    expect(gate([{ field: "hourOfDay", sign: "neq", value: 14, caseSensitive: false }]).ok).toBe(
      false,
    );
  });
  it("in / not_in (numeric as string array)", () => {
    expect(
      gate([{ field: "hourOfDay", sign: "in", value: ["14", "15"], caseSensitive: false }]).ok,
    ).toBe(true);
    expect(
      gate([{ field: "hourOfDay", sign: "not_in", value: ["0", "1"], caseSensitive: false }]).ok,
    ).toBe(true);
  });
});

describe("PQL evaluate — phone", () => {
  it("starts_with +380 hits", () => {
    expect(
      gate([{ field: "phone", sign: "starts_with", value: "+380", caseSensitive: false }]).ok,
    ).toBe(true);
  });
  it("ends_with 4567 hits", () => {
    expect(
      gate([{ field: "phone", sign: "ends_with", value: "4567", caseSensitive: false }]).ok,
    ).toBe(true);
  });
  it("contains 5012 hits", () => {
    expect(
      gate([{ field: "phone", sign: "contains", value: "5012", caseSensitive: false }]).ok,
    ).toBe(true);
  });
});

describe("PQL evaluate — utm_source", () => {
  it("eq google hits", () => {
    expect(
      gate([{ field: "utm_source", sign: "eq", value: "google", caseSensitive: false }]).ok,
    ).toBe(true);
  });
  it("contains oogl", () => {
    expect(
      gate([{ field: "utm_source", sign: "contains", value: "oogl", caseSensitive: false }]).ok,
    ).toBe(true);
  });
});

describe("PQL evaluate — timeOfDay", () => {
  it("eq hits the current HH:MM", () => {
    expect(
      gate([{ field: "timeOfDay", sign: "eq", value: "14:30", caseSensitive: false }]).ok,
    ).toBe(true);
  });
  it("eq misses a different HH:MM", () => {
    expect(
      gate([{ field: "timeOfDay", sign: "eq", value: "13:30", caseSensitive: false }]).ok,
    ).toBe(false);
  });
});

describe("PQL evaluate — logic", () => {
  it("AND all must pass", () => {
    const r = gate(
      [
        { field: "geo", sign: "eq", value: "UA", caseSensitive: false },
        { field: "hourOfDay", sign: "gte", value: 10, caseSensitive: false },
      ],
      "AND",
    );
    expect(r.ok).toBe(true);
  });
  it("AND shortcircuits on first miss and reports index", () => {
    const r = gate(
      [
        { field: "geo", sign: "eq", value: "UA", caseSensitive: false },
        { field: "hourOfDay", sign: "gte", value: 20, caseSensitive: false },
      ],
      "AND",
    );
    expect(r.ok).toBe(false);
    expect(r.failedRuleIndex).toBe(1);
    expect(r.failedField).toBe("hourOfDay");
  });
  it("OR any may pass", () => {
    const r = gate(
      [
        { field: "geo", sign: "eq", value: "XX", caseSensitive: false },
        { field: "hourOfDay", sign: "gte", value: 10, caseSensitive: false },
      ],
      "OR",
    );
    expect(r.ok).toBe(true);
  });
  it("OR misses everything", () => {
    const r = gate(
      [
        { field: "geo", sign: "eq", value: "XX", caseSensitive: false },
        { field: "hourOfDay", sign: "gte", value: 20, caseSensitive: false },
      ],
      "OR",
    );
    expect(r.ok).toBe(false);
  });
  it("empty rule list passes (no gate)", () => {
    expect(gate([]).ok).toBe(true);
  });
});

describe("PQL fields registry", () => {
  it("has all 8 declared fields", () => {
    const keys = PQL_FIELDS.map((f) => f.key).sort();
    expect(keys).toEqual(
      [
        "affiliateId",
        "geo",
        "hourOfDay",
        "phone",
        "subId",
        "timeOfDay",
        "utm_medium",
        "utm_source",
      ].sort(),
    );
  });
  it("isLegalSign honors the registry's per-field list", () => {
    expect(isLegalSign("geo", "matches")).toBe(true);
    expect(isLegalSign("hourOfDay", "matches")).toBe(false);
    expect(isLegalSign("timeOfDay", "contains")).toBe(false);
    expect(isLegalSign("phone", "starts_with")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { isValidIso3166Alpha2, normalizeGeo } from "./geo";

describe("normalizeGeo", () => {
  it.each([
    ["UA", "UA"],
    ["ua", "UA"],
    ["UK", "GB"],
    ["U.K.", "GB"],
    ["GBR", "GB"],
    ["USA", "US"],
    ["RUS", "RU"],
    ["DEU", "DE"],
    ["  de  ", "DE"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeGeo(raw)).toBe(expected);
  });

  it("unknown returns null", () => {
    expect(normalizeGeo("ZZ")).toBeNull();
    expect(normalizeGeo("")).toBeNull();
  });

  it("isValidIso3166Alpha2", () => {
    expect(isValidIso3166Alpha2("UA")).toBe(true);
    expect(isValidIso3166Alpha2("ZZ")).toBe(false);
  });
});

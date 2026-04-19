import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("normalizes Ukrainian local to E.164", () => {
    expect(normalizePhone("067 123 45 67", "UA")).toBe("+380671234567");
  });
  it("returns null for garbage", () => {
    expect(normalizePhone("abc", "UA")).toBeNull();
  });
  it("preserves already-E.164 input", () => {
    expect(normalizePhone("+380671234567", "UA")).toBe("+380671234567");
  });
});

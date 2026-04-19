import { formatCurrency, formatDate } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("utils", () => {
  it("formats currency", () => {
    expect(formatCurrency(1234)).toContain("1,234");
  });
  it("formats null date as dash", () => {
    expect(formatDate(null)).toBe("—");
  });
});

import { describe, expect, it } from "vitest";
import { fmtRel, fmtTime, maskPhone } from "./format";

describe("maskPhone", () => {
  it("masks the middle", () => {
    expect(maskPhone("+4915123456789")).toBe("+491····789");
  });
  it("returns em-dash for null/empty", () => {
    expect(maskPhone(null)).toBe("—");
    expect(maskPhone("")).toBe("—");
  });
});

describe("fmtTime", () => {
  it("formats HH:MM:SS with leading zeros", () => {
    const d = new Date("2026-01-01T05:07:09Z");
    expect(fmtTime(d)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

describe("fmtRel", () => {
  it("seconds", () => expect(fmtRel(new Date())).toMatch(/s ago$/));
  it("minutes", () => expect(fmtRel(new Date(Date.now() - 120_000))).toMatch(/m ago$/));
  it("hours", () => expect(fmtRel(new Date(Date.now() - 3700_000))).toMatch(/h ago$/));
});

import { describe, expect, it } from "vitest";
import { stateColor, stateToTone, type LeadStateKey } from "./tokens";

describe("stateColor", () => {
  it("returns dark-theme colour for FTD", () => {
    expect(stateColor("FTD", "dark")).toBe("oklch(82% 0.17 135)");
  });
  it("returns light-theme colour for FTD", () => {
    expect(stateColor("FTD", "light")).toBe("oklch(45% 0.17 135)");
  });
  it("returns all 9 states without crash", () => {
    const states: LeadStateKey[] = ["NEW","VALIDATING","REJECTED","PUSHING","PUSHED","ACCEPTED","DECLINED","FTD","FAILED"];
    for (const s of states) {
      expect(stateColor(s, "dark")).toMatch(/^oklch/);
      expect(stateColor(s, "light")).toMatch(/^oklch/);
    }
  });
});

describe("stateToTone", () => {
  it("maps ACCEPTED to success", () => {
    expect(stateToTone("ACCEPTED")).toBe("success");
  });
  it("maps FTD to success (celebrated)", () => {
    expect(stateToTone("FTD")).toBe("success");
  });
  it("maps FAILED to danger", () => {
    expect(stateToTone("FAILED")).toBe("danger");
  });
  it("maps NEW and REJECTED to neutral", () => {
    expect(stateToTone("NEW")).toBe("neutral");
    expect(stateToTone("REJECTED")).toBe("neutral");
  });
});

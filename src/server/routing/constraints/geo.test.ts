import { describe, expect, it } from "vitest";
import { evaluateGeo } from "./geo";

describe("evaluateGeo", () => {
  it("blocked_geo > allowed_geo — всегда блокирует", () => {
    const r = evaluateGeo("RU", { allowed: ["RU", "UA"], blocked: ["RU"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("blocked_geo");
  });

  it("allowed_geo пустой — пускает всё", () => {
    const r = evaluateGeo("DE", { allowed: [], blocked: [] });
    expect(r.ok).toBe(true);
  });

  it("allowed_geo задан, GEO не входит — not_in_allowed", () => {
    const r = evaluateGeo("DE", { allowed: ["RU", "UA"], blocked: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_in_allowed");
  });

  it("allowed содержит GEO — ok", () => {
    const r = evaluateGeo("UA", { allowed: ["RU", "UA"], blocked: [] });
    expect(r.ok).toBe(true);
  });
});

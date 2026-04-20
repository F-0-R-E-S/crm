import { describe, expect, it } from "vitest";
import { buildSignals } from "./fraud-signals";

describe("buildSignals", () => {
  it("no hits → empty", () => {
    expect(
      buildSignals({
        blacklistHit: null,
        phoneE164: null,
        geo: "DE",
        dedupHit: false,
        voipHit: false,
      }),
    ).toEqual([]);
  });

  it("blacklist hit", () => {
    const r = buildSignals({
      blacklistHit: "ip_blocked",
      phoneE164: null,
      geo: "DE",
      dedupHit: false,
      voipHit: false,
    });
    expect(r).toEqual([{ kind: "blacklist", detail: { reason: "ip_blocked" } }]);
  });

  it("geo_mismatch when phone country != lead.geo", () => {
    // DE phone but lead.geo=FR
    const r = buildSignals({
      blacklistHit: null,
      phoneE164: "+491701234567",
      geo: "FR",
      dedupHit: false,
      voipHit: false,
    });
    expect(r.some((s) => s.kind === "geo_mismatch")).toBe(true);
  });

  it("no geo_mismatch when phone country matches", () => {
    const r = buildSignals({
      blacklistHit: null,
      phoneE164: "+491701234567",
      geo: "DE",
      dedupHit: false,
      voipHit: false,
    });
    expect(r.some((s) => s.kind === "geo_mismatch")).toBe(false);
  });

  it("all kinds can co-fire", () => {
    const r = buildSignals({
      blacklistHit: "phone_blocked",
      phoneE164: "+491701234567",
      geo: "FR",
      dedupHit: true,
      voipHit: true,
      patternHit: true,
    });
    const kinds = r.map((s) => s.kind).sort();
    expect(kinds).toEqual(["blacklist", "dedup_hit", "geo_mismatch", "pattern_hit", "voip"]);
  });
});

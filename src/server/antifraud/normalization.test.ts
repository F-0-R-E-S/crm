import { describe, expect, it } from "vitest";
import { normalizeIntake } from "./normalization";

describe("normalizeIntake", () => {
  it("E.164 phone, lowercase email, alpha-2 geo", () => {
    const r = normalizeIntake({
      phone: "+380 50 111 2233",
      email: "  Foo@Example.COM  ",
      geo: "UK",
      ip: "8.8.8.8",
      landingUrl: "https://lp.example.com/x",
    });
    expect(r.phoneE164).toBe("+380501112233");
    expect(r.email).toBe("foo@example.com");
    expect(r.geo).toBe("GB");
    expect(r.warnings).toEqual([]);
  });

  it("пустая строка email считается отсутствием поля", () => {
    const r = normalizeIntake({ phone: null, email: "", geo: "UA", ip: "1.1.1.1" });
    expect(r.email).toBeNull();
  });

  it("невалидный phone возвращает error='phone_invalid'", () => {
    const r = normalizeIntake({ phone: "bogus", email: null, geo: "UA", ip: "1.1.1.1" });
    expect(r.error).toEqual({ field: "phone", code: "phone_invalid" });
  });

  it("неизвестный GEO возвращает error='geo_unknown'", () => {
    const r = normalizeIntake({ phone: null, email: "a@a.com", geo: "ZZ", ip: "1.1.1.1" });
    expect(r.error?.code).toBe("geo_unknown");
  });

  it("geo_mismatch добавляется как warning, но error=null (лид принимается)", () => {
    const r = normalizeIntake({
      phone: null,
      email: "a@a.com",
      geo: "UA",
      ip: "8.8.8.8",
      ipGeoLookup: () => "US",
    });
    expect(r.error).toBeNull();
    expect(r.warnings).toContainEqual({ code: "geo_mismatch", payloadGeo: "UA", ipGeo: "US" });
  });
});

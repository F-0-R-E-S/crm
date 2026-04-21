import { describe, expect, it } from "vitest";
import { ALLOWED_FIELDS, SchedulePatchError, validatePatch } from "./patch";

describe("validatePatch", () => {
  it("accepts allowed Broker fields", () => {
    const p = validatePatch("Broker", { isActive: false, dailyCap: 100 });
    expect(p).toEqual({ isActive: false, dailyCap: 100 });
  });

  it("rejects disallowed field for Broker", () => {
    expect(() => validatePatch("Broker", { endpointUrl: "https://evil" })).toThrowError(
      SchedulePatchError,
    );
  });

  it("rejects empty patch", () => {
    expect(() => validatePatch("Broker", {})).toThrowError(/at least one field/);
  });

  it("rejects non-object patch", () => {
    expect(() => validatePatch("Broker", null)).toThrowError();
    expect(() => validatePatch("Broker", [1, 2, 3] as unknown)).toThrowError();
  });

  it("accepts Flow status + activeVersionId", () => {
    const p = validatePatch("Flow", { status: "PUBLISHED", activeVersionId: "v1" });
    expect(p.status).toBe("PUBLISHED");
  });

  it("rejects Flow unwhitelisted field", () => {
    expect(() => validatePatch("Flow", { status: "PUBLISHED", name: "x" })).toThrow(
      /disallowed field/,
    );
  });

  it("accepts Cap fields including countryLimits array", () => {
    const p = validatePatch("Cap", {
      limit: 50,
      perCountry: true,
      countryLimits: [{ country: "US", limit: 20 }],
    });
    expect(p.limit).toBe(50);
  });

  it("allowlist is stable", () => {
    expect(ALLOWED_FIELDS.Broker).toContain("isActive");
    expect(ALLOWED_FIELDS.Broker).not.toContain("id");
    expect(ALLOWED_FIELDS.Broker).not.toContain("postbackSecret");
    expect(ALLOWED_FIELDS.Flow).toContain("status");
    expect(ALLOWED_FIELDS.Flow).not.toContain("name");
    expect(ALLOWED_FIELDS.Cap).toContain("limit");
  });
});

import { describe, expect, it } from "vitest";
import { applyMappingWithTransforms, maskPII, validateMapping } from "./mapping-preview";

const sampleLead = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+380501234567",
  geo: "UA",
  subId: "aff-123",
  ip: "8.8.8.8",
};

describe("mapping-preview", () => {
  it("простой маппинг без transforms", () => {
    const out = applyMappingWithTransforms(
      sampleLead,
      { firstName: { target: "first_name" }, email: { target: "email" } },
      {},
    );
    expect(out).toEqual({ first_name: "John", email: "john.doe@example.com" });
  });

  it("transform=concat объединяет поля через разделитель", () => {
    const out = applyMappingWithTransforms(
      sampleLead,
      {
        firstName: {
          target: "full_name",
          transform: "concat",
          concatWith: "lastName",
          sep: " ",
        },
      },
      {},
    );
    expect(out.full_name).toBe("John Doe");
  });

  it("transform=format_phone возвращает E.164 без '+'", () => {
    const out = applyMappingWithTransforms(
      sampleLead,
      { phone: { target: "tel", transform: "format_phone" } },
      {},
    );
    expect(out.tel).toBe("380501234567");
  });

  it("transform=default подставляет значение при null/undefined source", () => {
    const out = applyMappingWithTransforms(
      { ...sampleLead, subId: null as unknown as string },
      { subId: { target: "aff_id", transform: "default", defaultValue: "unknown" } },
      {},
    );
    expect(out.aff_id).toBe("unknown");
  });

  it("transform=uppercase / lowercase", () => {
    const out = applyMappingWithTransforms(
      sampleLead,
      {
        geo: { target: "country", transform: "uppercase" },
        email: { target: "email_lc", transform: "lowercase" },
      },
      {},
    );
    expect(out.country).toBe("UA");
    expect(out.email_lc).toBe("john.doe@example.com");
  });

  it("staticPayload merge-ится", () => {
    const out = applyMappingWithTransforms(
      sampleLead,
      {},
      { source: "gambchamp", utm_source: "fb" },
    );
    expect(out).toEqual({ source: "gambchamp", utm_source: "fb" });
  });

  it("maskPII маскирует email/phone/last_name/ip", () => {
    const masked = maskPII({
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone: "+380501234567",
      country: "UA",
      ip: "8.8.8.8",
      external_id: "x",
    });
    expect(masked.first_name).toBe("John");
    expect(masked.last_name).toBe("D***");
    expect(masked.email).toBe("j***@example.com");
    expect(masked.phone).toBe("+38050****567");
    expect(masked.ip).toBe("8.8.8.***");
    expect(masked.external_id).toBe("x");
    expect(masked.country).toBe("UA");
  });

  it("validateMapping возвращает missing required fields", () => {
    const r = validateMapping({ firstName: { target: "first_name" } }, [
      "first_name",
      "email",
      "country",
    ]);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["email", "country"]);
  });

  it("validateMapping ok если все required покрыты", () => {
    const r = validateMapping(
      {
        firstName: { target: "first_name" },
        email: { target: "email" },
        geo: { target: "country" },
      },
      ["first_name", "email", "country"],
    );
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });
});

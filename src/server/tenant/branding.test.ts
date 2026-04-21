import { describe, expect, it } from "vitest";
import { parseTenantTheme, themeToCssVars } from "./branding";

describe("parseTenantTheme", () => {
  it("returns empty object on null/undefined/invalid input", () => {
    expect(parseTenantTheme(null)).toEqual({});
    expect(parseTenantTheme(undefined)).toEqual({});
    expect(parseTenantTheme("not-an-object")).toEqual({});
    expect(parseTenantTheme({ unknownField: 1 })).toEqual({});
  });

  it("round-trips a full theme", () => {
    const theme = {
      brandName: "Acme CRM",
      logoUrl: "https://cdn.example.com/acme.png",
      primaryColor: "oklch(0.5 0.2 180)",
      accentColor: "#ff6600",
      legalLinks: {
        privacy: "https://acme.com/privacy",
        terms: "https://acme.com/terms",
      },
    };
    expect(parseTenantTheme(theme)).toEqual(theme);
  });

  it("rejects unknown fields (strict)", () => {
    const bad = { brandName: "A", evilField: "x" };
    expect(parseTenantTheme(bad)).toEqual({});
  });

  it("rejects non-URL logo", () => {
    expect(parseTenantTheme({ logoUrl: "not-a-url" })).toEqual({});
  });

  it("rejects dangerous color values", () => {
    // Colors allow CSS syntax but reject <script> / ; injection.
    expect(parseTenantTheme({ primaryColor: "url(javascript:alert(1))" })).toEqual({});
  });
});

describe("themeToCssVars", () => {
  it("emits --brand when primaryColor is set", () => {
    const vars = themeToCssVars({ primaryColor: "#123" });
    expect(vars["--brand"]).toBe("#123");
  });
  it("emits --accent when accentColor is set", () => {
    const vars = themeToCssVars({ accentColor: "oklch(0.6 0.1 40)" });
    expect(vars["--accent"]).toBe("oklch(0.6 0.1 40)");
  });
  it("empty theme → no vars", () => {
    expect(themeToCssVars({})).toEqual({});
  });
});

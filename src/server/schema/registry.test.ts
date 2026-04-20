import { describe, expect, it } from "vitest";
import { DEFAULT_VERSION, getSchemaForVersion, isVersionSupported, listVersions } from "./registry";

describe("schema registry", () => {
  it("содержит версию 2026-01 как default", () => {
    expect(DEFAULT_VERSION).toBe("2026-01");
    expect(isVersionSupported("2026-01")).toBe(true);
    expect(getSchemaForVersion("2026-01")).not.toBeNull();
  });

  it("неизвестная версия даёт null", () => {
    expect(isVersionSupported("1999-01")).toBe(false);
    expect(getSchemaForVersion("1999-01")).toBeNull();
  });

  it("listVersions возвращает active+deprecated", () => {
    const v = listVersions();
    expect(v.find((x) => x.version === "2026-01")?.status).toBe("active");
  });
});

import { describe, expect, it } from "vitest";
import { buildPayload } from "./template";

describe("buildPayload", () => {
  it("remaps fields and merges static payload", () => {
    const out = buildPayload(
      { firstName: "Ivan", phone: "+380671234567", geo: "UA" } as never,
      { firstName: "first_name", phone: "phone", geo: "country" } as never,
      { partner_id: 42 } as never,
    );
    expect(out).toEqual({
      first_name: "Ivan",
      phone: "+380671234567",
      country: "UA",
      partner_id: 42,
    });
  });

  it("ignores unmapped lead fields", () => {
    const out = buildPayload(
      { firstName: "A", lastName: "B", email: "x@y.z" } as never,
      { firstName: "fn" } as never,
      {} as never,
    );
    expect(out).toEqual({ fn: "A" });
  });

  it("does not overwrite static payload with remap collisions", () => {
    const out = buildPayload(
      { firstName: "A" } as never,
      { firstName: "name" } as never,
      { name: "static-wins" } as never,
    );
    expect(out.name).toBe("static-wins");
  });
});

import { describe, expect, it } from "vitest";
import { IntakeSchema } from "./intake";

describe("IntakeSchema safeString", () => {
  const base = {
    geo: "UA",
    ip: "8.8.8.8",
    email: "a@a.com",
    event_ts: new Date().toISOString(),
  };

  it("rejects <script> in first_name", () => {
    const r = IntakeSchema.safeParse({ ...base, first_name: "<script>alert(1)</script>" });
    expect(r.success).toBe(false);
  });

  it("rejects SQL injection patterns in sub_id", () => {
    const r = IntakeSchema.safeParse({ ...base, sub_id: "1' OR '1'='1; DROP TABLE leads;--" });
    expect(r.success).toBe(false);
  });

  it("accepts normal names and sub_ids", () => {
    const r = IntakeSchema.safeParse({
      ...base,
      first_name: "Олег",
      last_name: "O'Brien",
      sub_id: "camp_123_winter-sale",
    });
    expect(r.success).toBe(true);
  });

  it("requires email or phone", () => {
    const { email: _omit, ...without } = base;
    const r = IntakeSchema.safeParse(without);
    expect(r.success).toBe(false);
  });
});

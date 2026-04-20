import { describe, expect, it } from "vitest";
import { maskEmail, maskIp, maskPhone, redactObject } from "./pii-mask";

describe("pii-mask", () => {
  it("email — локальная часть → hash", () => {
    expect(maskEmail("alice@example.com")).toMatch(/^[a-f0-9]{8}@example\.com$/);
  });

  it("phone — только последние 4", () => {
    expect(maskPhone("+380501112233")).toBe("********2233");
  });

  it("ipv4 → /24", () => {
    expect(maskIp("192.168.1.42")).toBe("192.168.1.0/24");
  });

  it("ipv6 → /56", () => {
    expect(maskIp("2001:db8:1234:5678::1")).toBe("2001:db8:1200::/56");
  });

  it("redactObject рекурсивно маскирует email/phone/ip", () => {
    const out = redactObject({
      email: "a@b.com",
      phone: "+380501112233",
      ip: "1.2.3.4",
      nested: { email: "c@d.com" },
    }) as Record<string, unknown>;
    expect(out.email).not.toBe("a@b.com");
    expect(out.phone).toBe("********2233");
    expect((out.nested as Record<string, unknown>).email).not.toBe("c@d.com");
  });
});

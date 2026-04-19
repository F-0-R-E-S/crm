import { describe, expect, it } from "vitest";
import { signHmac, verifyHmac } from "./hmac";

describe("HMAC", () => {
  it("sign + verify round-trip", () => {
    const sig = signHmac("secret", "body-bytes");
    expect(verifyHmac("secret", "body-bytes", sig)).toBe(true);
  });
  it("rejects tampered body", () => {
    const sig = signHmac("secret", "body-bytes");
    expect(verifyHmac("secret", "tampered", sig)).toBe(false);
  });
  it("rejects wrong secret", () => {
    const sig = signHmac("secret", "body");
    expect(verifyHmac("other", "body", sig)).toBe(false);
  });
  it("constant-time comparison handles wrong length", () => {
    expect(verifyHmac("s", "b", "short")).toBe(false);
  });
});

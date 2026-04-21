import { describe, it, expect, beforeAll } from "vitest";
import { signOperatorToken, verifyOperatorToken } from "@/server/auth/operator-token";
import type { UserRole } from "@prisma/client";

const SECRET = "test-secret-at-least-32-bytes-long-for-jose-hs256!!";
const NOW = Math.floor(Date.now() / 1000);

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = SECRET;
});

describe("operator-token", () => {
  it("signs and round-trips a valid token", async () => {
    const token = await signOperatorToken({
      userId: "u_abc",
      role: "OPERATOR" as UserRole,
    });
    expect(typeof token).toBe("string");
    const claims = await verifyOperatorToken(token);
    expect(claims.userId).toBe("u_abc");
    expect(claims.role).toBe("OPERATOR");
  });

  it("rejects a tampered token", async () => {
    const token = await signOperatorToken({ userId: "u_x", role: "OPERATOR" as UserRole });
    await expect(verifyOperatorToken(token + "x")).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signOperatorToken({ userId: "u_y", role: "OPERATOR" as UserRole });
    process.env.NEXTAUTH_SECRET = "another-secret-that-is-at-least-32-bytes!!";
    await expect(verifyOperatorToken(token)).rejects.toThrow();
    process.env.NEXTAUTH_SECRET = SECRET;
  });

  it("rejects an expired token", async () => {
    const token = await signOperatorToken(
      { userId: "u_z", role: "OPERATOR" as UserRole },
      { expSec: NOW - 60 },
    );
    await expect(verifyOperatorToken(token)).rejects.toThrow(/expired|exp/i);
  });

  it("stamps scope=operator in claims", async () => {
    const token = await signOperatorToken({ userId: "u_a", role: "ADMIN" as UserRole });
    const claims = await verifyOperatorToken(token);
    expect(claims.scope).toBe("operator");
  });
});

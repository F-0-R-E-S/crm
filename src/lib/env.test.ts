import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const MIN_SECRET = "a".repeat(32);
const MIN_AUDIT = "b".repeat(16);

describe("parseEnv", () => {
  it("парсит минимальный валидный env с NEXTAUTH_SECRET", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://localhost:5432/x",
      REDIS_URL: "redis://localhost:6379",
      NEXTAUTH_SECRET: MIN_SECRET,
      AUDIT_HASH_CHAIN_SECRET: MIN_AUDIT,
    });
    expect(env.INTAKE_MAX_PAYLOAD_BYTES).toBe(64 * 1024);
    expect(env.ANTIFRAUD_DEDUP_WINDOW_DAYS).toBe(30);
    expect(env.INTAKE_DEFAULT_SCHEMA_VERSION).toBe("2026-01");
    expect(env.authSecret).toBe(MIN_SECRET);
  });

  it("принимает AUTH_SECRET как альтернативу NEXTAUTH_SECRET (NextAuth v5 convention)", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://localhost:5432/x",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET: MIN_SECRET,
      AUDIT_HASH_CHAIN_SECRET: MIN_AUDIT,
    });
    expect(env.authSecret).toBe(MIN_SECRET);
  });

  it("ломается если оба secret отсутствуют", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://localhost:5432/x",
        REDIS_URL: "redis://x",
        AUDIT_HASH_CHAIN_SECRET: MIN_AUDIT,
      }),
    ).toThrow(/NEXTAUTH_SECRET or AUTH_SECRET/);
  });

  it("ломается если DATABASE_URL пустой", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "",
        REDIS_URL: "redis://x",
        NEXTAUTH_SECRET: MIN_SECRET,
        AUDIT_HASH_CHAIN_SECRET: MIN_AUDIT,
      }),
    ).toThrow();
  });

  it("ломается если AUDIT_HASH_CHAIN_SECRET отсутствует (нет default)", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgres://localhost:5432/x",
        REDIS_URL: "redis://x",
        NEXTAUTH_SECRET: MIN_SECRET,
      }),
    ).toThrow();
  });

  it('zBool корректно парсит "false" как false (fix z.coerce.boolean bug)', () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://x",
      REDIS_URL: "redis://x",
      NEXTAUTH_SECRET: MIN_SECRET,
      AUDIT_HASH_CHAIN_SECRET: MIN_AUDIT,
      ANTIFRAUD_VOIP_CHECK_ENABLED: "false",
      ANTIFRAUD_DEDUP_CROSS_AFFILIATE: "0",
      INTAKE_STRICT_UNKNOWN_FIELDS: "true",
    });
    expect(env.ANTIFRAUD_VOIP_CHECK_ENABLED).toBe(false);
    expect(env.ANTIFRAUD_DEDUP_CROSS_AFFILIATE).toBe(false);
    expect(env.INTAKE_STRICT_UNKNOWN_FIELDS).toBe(true);
  });

  it("в production запрещает placeholder AUDIT_HASH_CHAIN_SECRET", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://x",
        REDIS_URL: "redis://x",
        NEXTAUTH_SECRET: MIN_SECRET,
        AUDIT_HASH_CHAIN_SECRET: "change-me-in-prod-min-16-chars!",
      }),
    ).toThrow(/AUDIT_HASH_CHAIN_SECRET must be set/);
  });
});

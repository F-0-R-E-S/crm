// Load .env for vitest (Node) tests so modules that validate process.env
// at import time (e.g. src/lib/env.ts) can find required variables.
// Keep this side-effect-only — no exports.
import { config } from "dotenv";

config({ quiet: true });

// Provide safe defaults for variables required by src/lib/env.ts.
// NEXTAUTH_SECRET and AUTH_SECRET are accepted interchangeably by the schema.
if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "t".repeat(32);
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://crm:crm@localhost:5432/crm?schema=public";
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = "redis://localhost:6379";
}
if (!process.env.AUDIT_HASH_CHAIN_SECRET) {
  process.env.AUDIT_HASH_CHAIN_SECRET = "test-audit-secret-16chars-min";
}

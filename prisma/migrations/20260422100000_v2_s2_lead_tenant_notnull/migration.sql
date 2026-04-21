-- v2.0 S2.0-2 — Harden Lead.tenantId.
--
-- S2.0-1 left Lead.tenantId nullable to avoid blocking hot-path ingest. Now
-- that all intake handlers stamp tenantId from the API-key row, any remaining
-- NULL leads are legacy data from the v1.5 window. Backfill them to
-- tenant_default, then enforce NOT NULL + DEFAULT at the DB level so even
-- mis-wired code paths stay safe.

-- 1. Backfill any legacy NULL leads.
UPDATE "Lead" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;

-- 2. Enforce NOT NULL + default.
ALTER TABLE "Lead" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_default';

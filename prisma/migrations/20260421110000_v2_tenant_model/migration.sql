-- v2.0 S2.0-1 — Tenant activation + backfill
-- 1) Create Tenant table + indexes
-- 2) Seed default tenant (fixed id)
-- 3) Add new tenantId columns (nullable)
-- 4) UPDATE all existing rows to reference default tenant
-- 5) ALTER tenantId SET NOT NULL on tables that must be scoped now
-- 6) Remaining indexes + enum additions
--
-- Rollback: DROP all indexes added here, ALTER tenantId DROP NOT NULL where set,
-- DROP tenantId columns on additive tables, DELETE FROM "Tenant" WHERE id = 'tenant_default',
-- DROP TABLE "Tenant".

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theme" JSONB NOT NULL DEFAULT '{}',
    "featureFlags" JSONB NOT NULL DEFAULT '{}',
    "adminAllowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

-- Seed default tenant (fixed id for idempotent backfill)
INSERT INTO "Tenant" ("id", "slug", "name", "displayName", "createdAt", "updatedAt")
VALUES ('tenant_default', 'default', 'Default Tenant', 'GambChamp Default', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- AlterTable: add tenantId columns (nullable first) to tables that didn't have them
ALTER TABLE "AffiliateIntakeWebhook" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AffiliatePayoutRule" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AlertLog" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AnalyticsPreset" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AnalyticsShareLink" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AutologinAttempt" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "BrokerPayoutRule" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Flow" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FlowVersion" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "IntakeSettings" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ManualReviewQueue" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ProxyEndpoint" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RotationRule" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ScheduledChange" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "TelegramSubscription" ADD COLUMN "tenantId" TEXT;

-- Backfill every existing row in every tenant-scoped table to the default tenant.
-- Pre-existing nullable columns:
UPDATE "Affiliate"              SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "ApiKey"                 SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "Broker"                 SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "BrokerTemplate"         SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "Lead"                   SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "User"                   SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
-- Newly added columns:
UPDATE "AffiliateIntakeWebhook" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "AffiliatePayoutRule"    SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "AlertLog"               SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "AnalyticsPreset"        SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "AnalyticsShareLink"     SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "AutologinAttempt"       SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "BrokerPayoutRule"       SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "Flow"                   SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "FlowVersion"            SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "IntakeSettings"         SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "ManualReviewQueue"      SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "ProxyEndpoint"          SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "RotationRule"           SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "ScheduledChange"        SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
UPDATE "TelegramSubscription"   SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;

-- After backfill: enforce NOT NULL on primary tables (Lead stays nullable — hot path).
-- Also set DEFAULT 'tenant_default' so inserts from v1.x code paths and
-- test fixtures that forget to supply tenantId route safely.
ALTER TABLE "Affiliate"      ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Affiliate"      ALTER COLUMN "tenantId" SET DEFAULT 'tenant_default';
ALTER TABLE "ApiKey"         ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ApiKey"         ALTER COLUMN "tenantId" SET DEFAULT 'tenant_default';
ALTER TABLE "Broker"         ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Broker"         ALTER COLUMN "tenantId" SET DEFAULT 'tenant_default';
ALTER TABLE "BrokerTemplate" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BrokerTemplate" ALTER COLUMN "tenantId" SET DEFAULT 'tenant_default';
ALTER TABLE "User"           ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "User"           ALTER COLUMN "tenantId" SET DEFAULT 'tenant_default';

-- CreateIndex for newly added tenantId columns
CREATE INDEX "AffiliateIntakeWebhook_tenantId_idx" ON "AffiliateIntakeWebhook"("tenantId");
CREATE INDEX "AffiliatePayoutRule_tenantId_idx"    ON "AffiliatePayoutRule"("tenantId");
CREATE INDEX "AlertLog_tenantId_idx"               ON "AlertLog"("tenantId");
CREATE INDEX "AnalyticsPreset_tenantId_idx"        ON "AnalyticsPreset"("tenantId");
CREATE INDEX "AnalyticsShareLink_tenantId_idx"     ON "AnalyticsShareLink"("tenantId");
CREATE INDEX "AutologinAttempt_tenantId_idx"       ON "AutologinAttempt"("tenantId");
CREATE INDEX "BrokerPayoutRule_tenantId_idx"       ON "BrokerPayoutRule"("tenantId");
CREATE INDEX "Flow_tenantId_idx"                   ON "Flow"("tenantId");
CREATE INDEX "FlowVersion_tenantId_idx"            ON "FlowVersion"("tenantId");
CREATE INDEX "IntakeSettings_tenantId_idx"         ON "IntakeSettings"("tenantId");
CREATE INDEX "ManualReviewQueue_tenantId_idx"      ON "ManualReviewQueue"("tenantId");
CREATE INDEX "ProxyEndpoint_tenantId_idx"          ON "ProxyEndpoint"("tenantId");
CREATE INDEX "RotationRule_tenantId_idx"           ON "RotationRule"("tenantId");
CREATE INDEX "ScheduledChange_tenantId_idx"        ON "ScheduledChange"("tenantId");
CREATE INDEX "TelegramSubscription_tenantId_idx"   ON "TelegramSubscription"("tenantId");

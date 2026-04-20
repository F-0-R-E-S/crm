-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AlgorithmScope" AS ENUM ('FLOW', 'BRANCH');

-- CreateEnum
CREATE TYPE "AlgorithmMode" AS ENUM ('WEIGHTED_ROUND_ROBIN', 'SLOTS_CHANCE');

-- CreateEnum
CREATE TYPE "CapWindow" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CapScope" ADD VALUE 'FLOW';
ALTER TYPE "CapScope" ADD VALUE 'BRANCH';
ALTER TYPE "CapScope" ADD VALUE 'TARGET';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadEventKind" ADD VALUE 'FLOW_FILTER_REJECT';
ALTER TYPE "LeadEventKind" ADD VALUE 'FALLBACK_HOP';
ALTER TYPE "LeadEventKind" ADD VALUE 'SIMULATE_DECISION';

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "isSandbox" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "prevHash" TEXT,
ADD COLUMN     "rowHash" TEXT;

-- AlterTable
ALTER TABLE "Broker" ADD COLUMN     "lastHealthCheckAt" TIMESTAMP(3),
ADD COLUMN     "lastHealthStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "lastPolledAt" TIMESTAMP(3),
ADD COLUMN     "pollIntervalMin" INTEGER,
ADD COLUMN     "statusPollIdsParam" TEXT,
ADD COLUMN     "statusPollPath" TEXT,
ADD COLUMN     "syncMode" TEXT NOT NULL DEFAULT 'webhook',
ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "IdempotencyKey" ADD COLUMN     "payloadHash" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "normalizationWarnings" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "rawPayload" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "LeadEvent" ADD COLUMN     "prevHash" TEXT,
ADD COLUMN     "rowHash" TEXT;

-- CreateTable
CREATE TABLE "AffiliateIntakeWebhook" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pausedAt" TIMESTAMP(3),
    "pausedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateIntakeWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "lastStatus" INTEGER,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSettings" (
    "affiliateId" TEXT NOT NULL,
    "requiredFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedGeo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dedupeWindowDays" INTEGER NOT NULL DEFAULT 30,
    "maxRpm" INTEGER NOT NULL DEFAULT 120,
    "acceptSchedule" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeSettings_pkey" PRIMARY KEY ("affiliateId")
);

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "FlowStatus" NOT NULL DEFAULT 'DRAFT',
    "activeVersionId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowVersion" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "graph" JSONB NOT NULL,
    "algorithm" JSONB NOT NULL,
    "entryFilters" JSONB NOT NULL DEFAULT '{}',
    "fallbackPolicy" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowBranch" (
    "id" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "algorithmOverride" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FlowBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowAlgorithmConfig" (
    "id" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "scope" "AlgorithmScope" NOT NULL,
    "scopeRefId" TEXT,
    "mode" "AlgorithmMode" NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "FlowAlgorithmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FallbackStep" (
    "id" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "hopOrder" INTEGER NOT NULL,
    "triggers" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "FallbackStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapDefinition" (
    "id" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "scope" "CapScope" NOT NULL,
    "scopeRefId" TEXT NOT NULL,
    "window" "CapWindow" NOT NULL,
    "limit" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "perCountry" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CapDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapCountryLimit" (
    "id" TEXT NOT NULL,
    "capDefId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,

    CONSTRAINT "CapCountryLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapCounter" (
    "id" TEXT NOT NULL,
    "scope" "CapScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "window" "CapWindow" NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "countries" TEXT[],
    "description" TEXT,
    "logoUrl" TEXT,
    "docsUrl" TEXT,
    "defaultHttpMethod" "HttpMethod" NOT NULL DEFAULT 'POST',
    "defaultHeaders" JSONB NOT NULL DEFAULT '{}',
    "defaultAuthType" "BrokerAuthType" NOT NULL DEFAULT 'NONE',
    "authConfigSchema" JSONB NOT NULL DEFAULT '{}',
    "fieldMapping" JSONB NOT NULL,
    "requiredFields" TEXT[],
    "staticPayload" JSONB NOT NULL DEFAULT '{}',
    "responseIdPath" TEXT,
    "postbackLeadIdPath" TEXT NOT NULL,
    "postbackStatusPath" TEXT NOT NULL,
    "statusMapping" JSONB NOT NULL,
    "rateLimitPerMin" INTEGER,
    "samplePayload" JSONB NOT NULL,
    "sampleResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerHealthCheck" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "httpStatus" INTEGER,
    "errorText" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerHealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerErrorSample" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "bucketIntervalSec" INTEGER NOT NULL,
    "totalPushes" INTEGER NOT NULL DEFAULT 0,
    "successPushes" INTEGER NOT NULL DEFAULT 0,
    "errorPushes" INTEGER NOT NULL DEFAULT 0,
    "timeoutPushes" INTEGER NOT NULL DEFAULT 0,
    "latencyP95Ms" INTEGER,
    "topErrorCodes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerErrorSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateIntakeWebhook_affiliateId_isActive_idx" ON "AffiliateIntakeWebhook"("affiliateId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_createdAt_idx" ON "WebhookDelivery"("webhookId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_nextAttemptAt_idx" ON "WebhookDelivery"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "Flow_activeVersionId_key" ON "Flow"("activeVersionId");

-- CreateIndex
CREATE INDEX "Flow_status_updatedAt_idx" ON "Flow"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "FlowVersion_flowId_createdAt_idx" ON "FlowVersion"("flowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlowVersion_flowId_versionNumber_key" ON "FlowVersion"("flowId", "versionNumber");

-- CreateIndex
CREATE INDEX "FlowBranch_flowVersionId_order_idx" ON "FlowBranch"("flowVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FlowBranch_flowVersionId_nodeId_key" ON "FlowBranch"("flowVersionId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowAlgorithmConfig_flowVersionId_scope_scopeRefId_key" ON "FlowAlgorithmConfig"("flowVersionId", "scope", "scopeRefId");

-- CreateIndex
CREATE INDEX "FallbackStep_flowVersionId_fromNodeId_idx" ON "FallbackStep"("flowVersionId", "fromNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "FallbackStep_flowVersionId_fromNodeId_hopOrder_key" ON "FallbackStep"("flowVersionId", "fromNodeId", "hopOrder");

-- CreateIndex
CREATE INDEX "CapDefinition_flowVersionId_scope_idx" ON "CapDefinition"("flowVersionId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "CapDefinition_flowVersionId_scope_scopeRefId_window_key" ON "CapDefinition"("flowVersionId", "scope", "scopeRefId", "window");

-- CreateIndex
CREATE INDEX "CapCountryLimit_capDefId_idx" ON "CapCountryLimit"("capDefId");

-- CreateIndex
CREATE UNIQUE INDEX "CapCountryLimit_capDefId_country_key" ON "CapCountryLimit"("capDefId", "country");

-- CreateIndex
CREATE INDEX "CapCounter_resetsAt_idx" ON "CapCounter"("resetsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CapCounter_scope_scopeId_window_bucketKey_country_key" ON "CapCounter"("scope", "scopeId", "window", "bucketKey", "country");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerTemplate_slug_key" ON "BrokerTemplate"("slug");

-- CreateIndex
CREATE INDEX "BrokerTemplate_vertical_status_idx" ON "BrokerTemplate"("vertical", "status");

-- CreateIndex
CREATE INDEX "BrokerTemplate_protocol_status_idx" ON "BrokerTemplate"("protocol", "status");

-- CreateIndex
CREATE INDEX "BrokerTemplate_countries_idx" ON "BrokerTemplate"("countries");

-- CreateIndex
CREATE INDEX "BrokerTemplate_name_idx" ON "BrokerTemplate"("name");

-- CreateIndex
CREATE INDEX "BrokerHealthCheck_brokerId_checkedAt_idx" ON "BrokerHealthCheck"("brokerId", "checkedAt");

-- CreateIndex
CREATE INDEX "BrokerErrorSample_brokerId_bucketStart_idx" ON "BrokerErrorSample"("brokerId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerErrorSample_brokerId_bucketStart_bucketIntervalSec_key" ON "BrokerErrorSample"("brokerId", "bucketStart", "bucketIntervalSec");

-- CreateIndex
CREATE INDEX "Broker_syncMode_isActive_idx" ON "Broker"("syncMode", "isActive");

-- CreateIndex
CREATE INDEX "Broker_templateId_idx" ON "Broker"("templateId");

-- AddForeignKey
ALTER TABLE "AffiliateIntakeWebhook" ADD CONSTRAINT "AffiliateIntakeWebhook_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "AffiliateIntakeWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSettings" ADD CONSTRAINT "IntakeSettings_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broker" ADD CONSTRAINT "Broker_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BrokerTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "FlowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowVersion" ADD CONSTRAINT "FlowVersion_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowBranch" ADD CONSTRAINT "FlowBranch_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "FlowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowAlgorithmConfig" ADD CONSTRAINT "FlowAlgorithmConfig_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "FlowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FallbackStep" ADD CONSTRAINT "FallbackStep_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "FlowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapDefinition" ADD CONSTRAINT "CapDefinition_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "FlowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapCountryLimit" ADD CONSTRAINT "CapCountryLimit_capDefId_fkey" FOREIGN KEY ("capDefId") REFERENCES "CapDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerHealthCheck" ADD CONSTRAINT "BrokerHealthCheck_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerErrorSample" ADD CONSTRAINT "BrokerErrorSample_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

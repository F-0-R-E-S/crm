-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('TRIAL', 'STARTER', 'GROWTH', 'PRO');

-- CreateEnum
CREATE TYPE "AutologinStage" AS ENUM ('INITIATING', 'CAPTCHA', 'AUTHENTICATING', 'SESSION_READY');

-- CreateEnum
CREATE TYPE "AutologinStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ManualReviewReason" AS ENUM ('BROKER_FAILED', 'CAP_REACHED', 'NO_BROKER_MATCH', 'FRAUD_BORDERLINE');

-- CreateEnum
CREATE TYPE "ManualReviewResolution" AS ENUM ('ACCEPT', 'REJECT', 'REQUEUE');

-- CreateEnum
CREATE TYPE "ConversionKind" AS ENUM ('REGISTRATION', 'FTD', 'REDEPOSIT');

-- CreateEnum
CREATE TYPE "PayoutRuleKind" AS ENUM ('CPA_FIXED', 'CPA_CRG', 'REV_SHARE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CRGCohortStatus" AS ENUM ('PENDING', 'MET', 'SHORTFALL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadEventKind" ADD VALUE 'MANUAL_REVIEW_ENQUEUED';
ALTER TYPE "LeadEventKind" ADD VALUE 'MANUAL_REVIEW_CLAIMED';
ALTER TYPE "LeadEventKind" ADD VALUE 'MANUAL_REVIEW_RESOLVED';
ALTER TYPE "LeadEventKind" ADD VALUE 'MANUAL_REVIEW_REQUEUED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'AFFILIATE_VIEWER';
ALTER TYPE "UserRole" ADD VALUE 'BROKER_VIEWER';

-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Broker" ADD COLUMN     "autologinEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autologinLoginUrl" TEXT,
ADD COLUMN     "retrySchedule" TEXT NOT NULL DEFAULT '10,60,300,900,3600',
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "BrokerTemplate" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "qualitySignals" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "orgId" TEXT,
ADD COLUMN     "tenantId" TEXT;

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "plan" "OrgPlan" NOT NULL DEFAULT 'TRIAL',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "stepData" JSONB NOT NULL DEFAULT '{}',
    "step1CompletedAt" TIMESTAMP(3),
    "step2CompletedAt" TIMESTAMP(3),
    "step3CompletedAt" TIMESTAMP(3),
    "step4CompletedAt" TIMESTAMP(3),
    "step5CompletedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxyEndpoint" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'brightdata',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastLatencyMs" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "consecutiveFails" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxyEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutologinAttempt" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "proxyEndpointId" TEXT,
    "stage" "AutologinStage" NOT NULL DEFAULT 'INITIATING',
    "status" "AutologinStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "errorStage" "AutologinStage",
    "captchaUsed" BOOLEAN NOT NULL DEFAULT false,
    "sessionTokenRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutologinAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualReviewQueue" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "reason" "ManualReviewReason" NOT NULL,
    "lastBrokerId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" "ManualReviewResolution",
    "resolutionNote" TEXT,

    CONSTRAINT "ManualReviewQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadDailyRoll" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL DEFAULT '__none__',
    "geo" TEXT NOT NULL,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "totalValidated" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "totalPushed" INTEGER NOT NULL DEFAULT 0,
    "totalAccepted" INTEGER NOT NULL DEFAULT 0,
    "totalDeclined" INTEGER NOT NULL DEFAULT 0,
    "totalFtd" INTEGER NOT NULL DEFAULT 0,
    "sumRevenue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadDailyRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadHourlyRoll" (
    "id" TEXT NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL DEFAULT '__none__',
    "geo" TEXT NOT NULL,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "totalValidated" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "totalPushed" INTEGER NOT NULL DEFAULT 0,
    "totalAccepted" INTEGER NOT NULL DEFAULT 0,
    "totalDeclined" INTEGER NOT NULL DEFAULT 0,
    "totalFtd" INTEGER NOT NULL DEFAULT 0,
    "sumRevenue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadHourlyRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBotConfig" (
    "id" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botUsername" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "eventTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brokerFilter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affiliateFilter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mutedBrokerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "linkTokenHash" TEXT,
    "linkTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramEventLog" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "messageText" TEXT,
    "sentAt" TIMESTAMP(3),
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "telegramMsgId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" "ConversionKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "brokerReportedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerPayoutRule" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "kind" "PayoutRuleKind" NOT NULL,
    "cpaAmount" DECIMAL(12,2),
    "crgRate" DECIMAL(5,4),
    "revShareRate" DECIMAL(5,4),
    "minQualifiedDeposit" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerPayoutRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePayoutRule" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "brokerId" TEXT,
    "kind" "PayoutRuleKind" NOT NULL,
    "cpaAmount" DECIMAL(12,2),
    "crgRate" DECIMAL(5,4),
    "revShareRate" DECIMAL(5,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePayoutRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRGCohort" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "cohortStart" TIMESTAMP(3) NOT NULL,
    "cohortEnd" TIMESTAMP(3) NOT NULL,
    "cohortSize" INTEGER NOT NULL DEFAULT 0,
    "ftdCount" INTEGER NOT NULL DEFAULT 0,
    "ftdRate" DECIMAL(5,4),
    "status" "CRGCohortStatus" NOT NULL DEFAULT 'PENDING',
    "shortfallAmount" DECIMAL(12,2),
    "guaranteedRate" DECIMAL(5,4),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRGCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerInvoice" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateInvoice" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "brokerInvoiceId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "measurement" JSONB NOT NULL DEFAULT '{}',
    "message" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "ackedAt" TIMESTAMP(3),
    "ackedBy" TEXT,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_slug_key" ON "Org"("slug");

-- CreateIndex
CREATE INDEX "Org_plan_idx" ON "Org"("plan");

-- CreateIndex
CREATE INDEX "Org_trialEndsAt_idx" ON "Org"("trialEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_orgId_key" ON "OnboardingProgress"("orgId");

-- CreateIndex
CREATE INDEX "OnboardingProgress_completedAt_idx" ON "OnboardingProgress"("completedAt");

-- CreateIndex
CREATE INDEX "OnboardingProgress_startedAt_idx" ON "OnboardingProgress"("startedAt");

-- CreateIndex
CREATE INDEX "ProxyEndpoint_isActive_lastHealthStatus_idx" ON "ProxyEndpoint"("isActive", "lastHealthStatus");

-- CreateIndex
CREATE INDEX "ProxyEndpoint_country_idx" ON "ProxyEndpoint"("country");

-- CreateIndex
CREATE INDEX "AutologinAttempt_brokerId_startedAt_idx" ON "AutologinAttempt"("brokerId", "startedAt");

-- CreateIndex
CREATE INDEX "AutologinAttempt_leadId_startedAt_idx" ON "AutologinAttempt"("leadId", "startedAt");

-- CreateIndex
CREATE INDEX "AutologinAttempt_status_startedAt_idx" ON "AutologinAttempt"("status", "startedAt");

-- CreateIndex
CREATE INDEX "AutologinAttempt_startedAt_idx" ON "AutologinAttempt"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManualReviewQueue_leadId_key" ON "ManualReviewQueue"("leadId");

-- CreateIndex
CREATE INDEX "ManualReviewQueue_resolvedAt_idx" ON "ManualReviewQueue"("resolvedAt");

-- CreateIndex
CREATE INDEX "ManualReviewQueue_claimedBy_idx" ON "ManualReviewQueue"("claimedBy");

-- CreateIndex
CREATE INDEX "ManualReviewQueue_reason_createdAt_idx" ON "ManualReviewQueue"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "LeadDailyRoll_date_idx" ON "LeadDailyRoll"("date");

-- CreateIndex
CREATE INDEX "LeadDailyRoll_affiliateId_date_idx" ON "LeadDailyRoll"("affiliateId", "date");

-- CreateIndex
CREATE INDEX "LeadDailyRoll_brokerId_date_idx" ON "LeadDailyRoll"("brokerId", "date");

-- CreateIndex
CREATE INDEX "LeadDailyRoll_geo_date_idx" ON "LeadDailyRoll"("geo", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LeadDailyRoll_date_affiliateId_brokerId_geo_key" ON "LeadDailyRoll"("date", "affiliateId", "brokerId", "geo");

-- CreateIndex
CREATE INDEX "LeadHourlyRoll_hour_idx" ON "LeadHourlyRoll"("hour");

-- CreateIndex
CREATE INDEX "LeadHourlyRoll_affiliateId_hour_idx" ON "LeadHourlyRoll"("affiliateId", "hour");

-- CreateIndex
CREATE INDEX "LeadHourlyRoll_brokerId_hour_idx" ON "LeadHourlyRoll"("brokerId", "hour");

-- CreateIndex
CREATE INDEX "LeadHourlyRoll_geo_hour_idx" ON "LeadHourlyRoll"("geo", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "LeadHourlyRoll_hour_affiliateId_brokerId_geo_key" ON "LeadHourlyRoll"("hour", "affiliateId", "brokerId", "geo");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsShareLink_token_key" ON "AnalyticsShareLink"("token");

-- CreateIndex
CREATE INDEX "AnalyticsShareLink_expiresAt_idx" ON "AnalyticsShareLink"("expiresAt");

-- CreateIndex
CREATE INDEX "AnalyticsShareLink_createdBy_createdAt_idx" ON "AnalyticsShareLink"("createdBy", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsPreset_userId_createdAt_idx" ON "AnalyticsPreset"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsPreset_userId_name_key" ON "AnalyticsPreset"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramBotConfig_webhookSecret_key" ON "TelegramBotConfig"("webhookSecret");

-- CreateIndex
CREATE INDEX "TelegramBotConfig_isActive_idx" ON "TelegramBotConfig"("isActive");

-- CreateIndex
CREATE INDEX "TelegramSubscription_chatId_isActive_idx" ON "TelegramSubscription"("chatId", "isActive");

-- CreateIndex
CREATE INDEX "TelegramSubscription_linkTokenHash_idx" ON "TelegramSubscription"("linkTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSubscription_userId_chatId_key" ON "TelegramSubscription"("userId", "chatId");

-- CreateIndex
CREATE INDEX "TelegramEventLog_chatId_createdAt_idx" ON "TelegramEventLog"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "TelegramEventLog_eventType_createdAt_idx" ON "TelegramEventLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "TelegramEventLog_successful_createdAt_idx" ON "TelegramEventLog"("successful", "createdAt");

-- CreateIndex
CREATE INDEX "Conversion_leadId_kind_idx" ON "Conversion"("leadId", "kind");

-- CreateIndex
CREATE INDEX "Conversion_occurredAt_idx" ON "Conversion"("occurredAt");

-- CreateIndex
CREATE INDEX "Conversion_kind_occurredAt_idx" ON "Conversion"("kind", "occurredAt");

-- CreateIndex
CREATE INDEX "BrokerPayoutRule_brokerId_activeFrom_idx" ON "BrokerPayoutRule"("brokerId", "activeFrom");

-- CreateIndex
CREATE INDEX "BrokerPayoutRule_brokerId_activeTo_idx" ON "BrokerPayoutRule"("brokerId", "activeTo");

-- CreateIndex
CREATE INDEX "AffiliatePayoutRule_affiliateId_brokerId_activeFrom_idx" ON "AffiliatePayoutRule"("affiliateId", "brokerId", "activeFrom");

-- CreateIndex
CREATE INDEX "AffiliatePayoutRule_affiliateId_activeTo_idx" ON "AffiliatePayoutRule"("affiliateId", "activeTo");

-- CreateIndex
CREATE INDEX "CRGCohort_status_cohortEnd_idx" ON "CRGCohort"("status", "cohortEnd");

-- CreateIndex
CREATE INDEX "CRGCohort_brokerId_status_idx" ON "CRGCohort"("brokerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CRGCohort_brokerId_cohortStart_cohortEnd_key" ON "CRGCohort"("brokerId", "cohortStart", "cohortEnd");

-- CreateIndex
CREATE INDEX "BrokerInvoice_status_periodEnd_idx" ON "BrokerInvoice"("status", "periodEnd");

-- CreateIndex
CREATE INDEX "BrokerInvoice_brokerId_periodEnd_idx" ON "BrokerInvoice"("brokerId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerInvoice_brokerId_periodStart_periodEnd_key" ON "BrokerInvoice"("brokerId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateInvoice_brokerInvoiceId_key" ON "AffiliateInvoice"("brokerInvoiceId");

-- CreateIndex
CREATE INDEX "AffiliateInvoice_status_periodEnd_idx" ON "AffiliateInvoice"("status", "periodEnd");

-- CreateIndex
CREATE INDEX "AffiliateInvoice_affiliateId_periodEnd_idx" ON "AffiliateInvoice"("affiliateId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateInvoice_affiliateId_periodStart_periodEnd_key" ON "AffiliateInvoice"("affiliateId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AlertLog_ruleKey_triggeredAt_idx" ON "AlertLog"("ruleKey", "triggeredAt");

-- CreateIndex
CREATE INDEX "AlertLog_resolvedAt_idx" ON "AlertLog"("resolvedAt");

-- CreateIndex
CREATE INDEX "AlertLog_ackedAt_idx" ON "AlertLog"("ackedAt");

-- CreateIndex
CREATE INDEX "Affiliate_tenantId_idx" ON "Affiliate"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "Broker_tenantId_idx" ON "Broker"("tenantId");

-- CreateIndex
CREATE INDEX "BrokerTemplate_tenantId_idx" ON "BrokerTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutologinAttempt" ADD CONSTRAINT "AutologinAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutologinAttempt" ADD CONSTRAINT "AutologinAttempt_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutologinAttempt" ADD CONSTRAINT "AutologinAttempt_proxyEndpointId_fkey" FOREIGN KEY ("proxyEndpointId") REFERENCES "ProxyEndpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewQueue" ADD CONSTRAINT "ManualReviewQueue_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewQueue" ADD CONSTRAINT "ManualReviewQueue_claimedBy_fkey" FOREIGN KEY ("claimedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewQueue" ADD CONSTRAINT "ManualReviewQueue_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewQueue" ADD CONSTRAINT "ManualReviewQueue_lastBrokerId_fkey" FOREIGN KEY ("lastBrokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramSubscription" ADD CONSTRAINT "TelegramSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerPayoutRule" ADD CONSTRAINT "BrokerPayoutRule_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePayoutRule" ADD CONSTRAINT "AffiliatePayoutRule_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateInvoice" ADD CONSTRAINT "AffiliateInvoice_brokerInvoiceId_fkey" FOREIGN KEY ("brokerInvoiceId") REFERENCES "BrokerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;


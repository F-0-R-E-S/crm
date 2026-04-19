-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('POST', 'PUT');

-- CreateEnum
CREATE TYPE "BrokerAuthType" AS ENUM ('NONE', 'BEARER', 'BASIC', 'API_KEY_HEADER', 'API_KEY_QUERY');

-- CreateEnum
CREATE TYPE "LeadState" AS ENUM ('NEW', 'VALIDATING', 'REJECTED', 'PUSHING', 'PUSHED', 'ACCEPTED', 'DECLINED', 'FTD', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadEventKind" AS ENUM ('RECEIVED', 'VALIDATION_FAIL', 'REJECTED_ANTIFRAUD', 'ROUTING_DECIDED', 'CAP_BLOCKED', 'NO_BROKER_AVAILABLE', 'BROKER_PUSH_ATTEMPT', 'BROKER_PUSH_SUCCESS', 'BROKER_PUSH_FAIL', 'POSTBACK_RECEIVED', 'STATE_TRANSITION', 'MANUAL_OVERRIDE', 'OUTBOUND_POSTBACK_SENT', 'OUTBOUND_POSTBACK_FAILED');

-- CreateEnum
CREATE TYPE "CapScope" AS ENUM ('AFFILIATE', 'BROKER');

-- CreateEnum
CREATE TYPE "BlacklistKind" AS ENUM ('IP_CIDR', 'IP_EXACT', 'EMAIL_DOMAIN', 'PHONE_E164');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalDailyCap" INTEGER,
    "postbackUrl" TEXT,
    "postbackSecret" TEXT,
    "postbackEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyCap" INTEGER,
    "workingHours" JSONB,
    "endpointUrl" TEXT NOT NULL,
    "httpMethod" "HttpMethod" NOT NULL DEFAULT 'POST',
    "headers" JSONB NOT NULL DEFAULT '{}',
    "authType" "BrokerAuthType" NOT NULL DEFAULT 'NONE',
    "authConfig" JSONB NOT NULL DEFAULT '{}',
    "fieldMapping" JSONB NOT NULL,
    "staticPayload" JSONB NOT NULL DEFAULT '{}',
    "responseIdPath" TEXT,
    "postbackSecret" TEXT NOT NULL,
    "postbackLeadIdPath" TEXT NOT NULL,
    "postbackStatusPath" TEXT NOT NULL,
    "statusMapping" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationRule" (
    "id" TEXT NOT NULL,
    "geo" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RotationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "externalLeadId" TEXT,
    "affiliateId" TEXT NOT NULL,
    "brokerId" TEXT,
    "state" "LeadState" NOT NULL DEFAULT 'NEW',
    "rejectReason" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "phoneHash" TEXT,
    "emailHash" TEXT,
    "geo" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "landingUrl" TEXT,
    "subId" TEXT,
    "utm" JSONB NOT NULL DEFAULT '{}',
    "eventTs" TIMESTAMP(3) NOT NULL,
    "brokerExternalId" TEXT,
    "lastBrokerStatus" TEXT,
    "lastPushAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "ftdAt" TIMESTAMP(3),
    "traceId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" "LeadEventKind" NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "leadId" TEXT,
    "responseCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "DailyCap" (
    "id" TEXT NOT NULL,
    "scope" "CapScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyCap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "kind" "BlacklistKind" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostbackReceipt" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "leadId" TEXT,
    "traceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostbackReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundPostback" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "errorMessage" TEXT,
    "attemptN" INTEGER NOT NULL DEFAULT 1,
    "deliveredAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundPostback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB NOT NULL DEFAULT '{}',
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Affiliate_isActive_idx" ON "Affiliate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_affiliateId_isRevoked_idx" ON "ApiKey"("affiliateId", "isRevoked");

-- CreateIndex
CREATE INDEX "Broker_isActive_idx" ON "Broker"("isActive");

-- CreateIndex
CREATE INDEX "RotationRule_geo_isActive_priority_idx" ON "RotationRule"("geo", "isActive", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "RotationRule_geo_brokerId_key" ON "RotationRule"("geo", "brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_traceId_key" ON "Lead"("traceId");

-- CreateIndex
CREATE INDEX "Lead_affiliateId_createdAt_idx" ON "Lead"("affiliateId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_brokerId_createdAt_idx" ON "Lead"("brokerId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_geo_state_idx" ON "Lead"("geo", "state");

-- CreateIndex
CREATE INDEX "Lead_phoneHash_idx" ON "Lead"("phoneHash");

-- CreateIndex
CREATE INDEX "Lead_emailHash_idx" ON "Lead"("emailHash");

-- CreateIndex
CREATE INDEX "Lead_state_createdAt_idx" ON "Lead"("state", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_externalLeadId_affiliateId_idx" ON "Lead"("externalLeadId", "affiliateId");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_createdAt_idx" ON "LeadEvent"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_affiliateId_key_key" ON "IdempotencyKey"("affiliateId", "key");

-- CreateIndex
CREATE INDEX "DailyCap_day_idx" ON "DailyCap"("day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCap_scope_scopeId_day_key" ON "DailyCap"("scope", "scopeId", "day");

-- CreateIndex
CREATE INDEX "Blacklist_kind_idx" ON "Blacklist"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_kind_value_key" ON "Blacklist"("kind", "value");

-- CreateIndex
CREATE INDEX "PostbackReceipt_brokerId_createdAt_idx" ON "PostbackReceipt"("brokerId", "createdAt");

-- CreateIndex
CREATE INDEX "PostbackReceipt_leadId_idx" ON "PostbackReceipt"("leadId");

-- CreateIndex
CREATE INDEX "OutboundPostback_affiliateId_createdAt_idx" ON "OutboundPostback"("affiliateId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundPostback_leadId_createdAt_idx" ON "OutboundPostback"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundPostback_deliveredAt_nextRetryAt_idx" ON "OutboundPostback"("deliveredAt", "nextRetryAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationRule" ADD CONSTRAINT "RotationRule_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundPostback" ADD CONSTRAINT "OutboundPostback_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundPostback" ADD CONSTRAINT "OutboundPostback_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

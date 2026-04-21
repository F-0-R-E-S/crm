-- CreateEnum
CREATE TYPE "ScheduledChangeEntity" AS ENUM ('Flow', 'Broker', 'Cap');

-- CreateEnum
CREATE TYPE "ScheduledChangeStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "StatusCategory" AS ENUM ('NEW', 'QUALIFIED', 'REJECTED', 'CONVERTED');

-- DropIndex
DROP INDEX "LeadDailyRoll_date_affiliateId_brokerId_geo_key";

-- AlterTable
ALTER TABLE "AnalyticsPreset" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Broker" ADD COLUMN     "clonedFromId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "canonicalStatus" TEXT;

-- AlterTable
ALTER TABLE "LeadDailyRoll" ADD COLUMN     "canonicalStatus" TEXT NOT NULL DEFAULT '__none__';

-- CreateTable
CREATE TABLE "CanonicalStatus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" "StatusCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledChange" (
    "id" TEXT NOT NULL,
    "entityType" "ScheduledChangeEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "applyAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledChangeStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "appliedBy" TEXT,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusMapping" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "rawStatus" TEXT NOT NULL,
    "canonicalStatusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "StatusMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanonicalStatus_category_sortOrder_idx" ON "CanonicalStatus"("category" ASC, "sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalStatus_code_key" ON "CanonicalStatus"("code" ASC);

-- CreateIndex
CREATE INDEX "ScheduledChange_createdBy_idx" ON "ScheduledChange"("createdBy" ASC);

-- CreateIndex
CREATE INDEX "ScheduledChange_entityType_entityId_idx" ON "ScheduledChange"("entityType" ASC, "entityId" ASC);

-- CreateIndex
CREATE INDEX "ScheduledChange_status_applyAt_idx" ON "ScheduledChange"("status" ASC, "applyAt" ASC);

-- CreateIndex
CREATE INDEX "StatusMapping_brokerId_idx" ON "StatusMapping"("brokerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StatusMapping_brokerId_rawStatus_key" ON "StatusMapping"("brokerId" ASC, "rawStatus" ASC);

-- CreateIndex
CREATE INDEX "StatusMapping_canonicalStatusId_idx" ON "StatusMapping"("canonicalStatusId" ASC);

-- CreateIndex
CREATE INDEX "AnalyticsPreset_userId_isDefault_idx" ON "AnalyticsPreset"("userId" ASC, "isDefault" ASC);

-- CreateIndex
CREATE INDEX "Broker_clonedFromId_idx" ON "Broker"("clonedFromId" ASC);

-- CreateIndex
CREATE INDEX "LeadDailyRoll_canonicalStatus_date_idx" ON "LeadDailyRoll"("canonicalStatus" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LeadDailyRoll_date_affiliateId_brokerId_geo_canonicalStatus_key" ON "LeadDailyRoll"("date" ASC, "affiliateId" ASC, "brokerId" ASC, "geo" ASC, "canonicalStatus" ASC);

-- AddForeignKey
ALTER TABLE "Broker" ADD CONSTRAINT "Broker_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusMapping" ADD CONSTRAINT "StatusMapping_canonicalStatusId_fkey" FOREIGN KEY ("canonicalStatusId") REFERENCES "CanonicalStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;


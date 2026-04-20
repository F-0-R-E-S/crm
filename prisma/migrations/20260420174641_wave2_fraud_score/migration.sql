-- AlterEnum
ALTER TYPE "LeadEventKind" ADD VALUE 'FRAUD_SCORED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "fraudScore" INTEGER,
ADD COLUMN     "fraudSignals" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "FraudPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'global',
    "weightBlacklist" INTEGER NOT NULL DEFAULT 40,
    "weightGeoMismatch" INTEGER NOT NULL DEFAULT 15,
    "weightVoip" INTEGER NOT NULL DEFAULT 20,
    "weightDedupHit" INTEGER NOT NULL DEFAULT 10,
    "weightPatternHit" INTEGER NOT NULL DEFAULT 15,
    "autoRejectThreshold" INTEGER NOT NULL DEFAULT 80,
    "borderlineMin" INTEGER NOT NULL DEFAULT 60,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FraudPolicy_name_key" ON "FraudPolicy"("name");

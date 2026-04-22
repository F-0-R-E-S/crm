-- CreateEnum
CREATE TYPE "CapBehaviorPattern" AS ENUM ('REGULAR');

-- CreateEnum
CREATE TYPE "CapCounterKind" AS ENUM ('PUSHED', 'REJECTED');

-- DropIndex
DROP INDEX "CapCounter_scope_scopeId_window_bucketKey_country_key";

-- AlterTable
ALTER TABLE "CapCounter" ADD COLUMN     "kind" "CapCounterKind" NOT NULL DEFAULT 'PUSHED';

-- AlterTable
ALTER TABLE "CapDefinition" ADD COLUMN     "behaviorPattern" "CapBehaviorPattern" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "pqlScope" JSONB,
ADD COLUMN     "rejectedLimit" INTEGER,
ADD COLUMN     "rejectedLimitAsPercent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionsInARow" INTEGER;

-- CreateTable
CREATE TABLE "ComparingBucketStat" (
    "id" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "branchNodeId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "sampleN" INTEGER NOT NULL DEFAULT 0,
    "pushed" INTEGER NOT NULL DEFAULT 0,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "ftds" INTEGER NOT NULL DEFAULT 0,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComparingBucketStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComparingBucketStat_flowVersionId_nodeId_idx" ON "ComparingBucketStat"("flowVersionId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ComparingBucketStat_flowVersionId_nodeId_branchNodeId_bucke_key" ON "ComparingBucketStat"("flowVersionId", "nodeId", "branchNodeId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "CapCounter_scope_scopeId_window_bucketKey_country_kind_key" ON "CapCounter"("scope", "scopeId", "window", "bucketKey", "country", "kind");

-- AddForeignKey
ALTER TABLE "ComparingBucketStat" ADD CONSTRAINT "ComparingBucketStat_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "FlowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadEventKind" ADD VALUE 'PENDING_HOLD_STARTED';
ALTER TYPE "LeadEventKind" ADD VALUE 'PENDING_HOLD_RELEASED';
ALTER TYPE "LeadEventKind" ADD VALUE 'SHAVE_SUSPECTED';

-- AlterEnum
ALTER TYPE "LeadState" ADD VALUE 'PENDING_HOLD';

-- AlterTable
ALTER TABLE "Broker" ADD COLUMN     "pendingHoldMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "pendingHoldUntil" TIMESTAMP(3),
ADD COLUMN     "shaveSuspected" BOOLEAN NOT NULL DEFAULT false;

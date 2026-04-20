-- AlterEnum
ALTER TYPE "LeadState" ADD VALUE 'REJECTED_FRAUD';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;

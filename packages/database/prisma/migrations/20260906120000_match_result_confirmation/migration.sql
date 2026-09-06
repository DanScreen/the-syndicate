-- AlterTable
ALTER TABLE "Match" ADD COLUMN "finishedAt" TIMESTAMP(3),
ADD COLUMN "scoreLocked" BOOLEAN NOT NULL DEFAULT false;

-- Existing FINISHED rows should not re-enter the confirmation window on deploy.
-- Treat their last sync (or kickoff) as already past the 1h confirmation gate.
UPDATE "Match"
SET "finishedAt" = COALESCE("lastSyncedAt", "kickoff") - INTERVAL '1 hour'
WHERE status IN ('FINISHED', 'POSTPONED', 'CANCELLED', 'SUSPENDED', 'AWARDED')
  AND "finishedAt" IS NULL;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "scoreStableSince" TIMESTAMP(3);

-- Existing terminal rows: treat current score as already stable at finishedAt
-- so deploy does not re-open the confirmation window.
UPDATE "Match"
SET "scoreStableSince" = "finishedAt"
WHERE "finishedAt" IS NOT NULL
  AND "scoreStableSince" IS NULL;

-- Multi-leg accas: group quota + per-round snapshot + legIndex uniqueness.

ALTER TABLE "Group" ADD COLUMN "legsPerMember" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Round" ADD COLUMN "legsPerMember" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Leg" ADD COLUMN "legIndex" INTEGER NOT NULL DEFAULT 1;

-- Backfill: every existing group/round stays on the one-leg default.
UPDATE "Group" SET "legsPerMember" = 1;
UPDATE "Round" SET "legsPerMember" = 1;
UPDATE "Leg" SET "legIndex" = 1 WHERE "legIndex" IS NULL OR "legIndex" < 1;

-- Existing rows: one leg per member → legIndex 1 (default). Drop old unique.
DROP INDEX IF EXISTS "Leg_roundId_userId_key";

CREATE UNIQUE INDEX "Leg_roundId_userId_legIndex_key" ON "Leg"("roundId", "userId", "legIndex");

ALTER TABLE "Group"
ADD COLUMN "maxActiveBets" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Round"
ADD COLUMN "betNumber" INTEGER;

WITH numbered_rounds AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "groupId"
      ORDER BY "createdAt" ASC, "id" ASC
    )::INTEGER AS "betNumber"
  FROM "Round"
)
UPDATE "Round"
SET "betNumber" = numbered_rounds."betNumber"
FROM numbered_rounds
WHERE "Round"."id" = numbered_rounds."id";

CREATE UNIQUE INDEX "Round_groupId_betNumber_key"
ON "Round"("groupId", "betNumber");

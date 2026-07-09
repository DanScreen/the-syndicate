-- Backfill unit-stake points for legs settled under the old flat scoring model.
UPDATE "Leg"
SET "pointsAwarded" = CASE
  WHEN "outcome" = 'won' THEN ROUND(CAST("odds" - 1 AS numeric), 2)
  WHEN "outcome" = 'lost' THEN -1
  WHEN "outcome" = 'void' THEN 0
  ELSE 0
END
WHERE "outcome" != 'pending';

UPDATE "GroupMember" gm
SET "points" = COALESCE((
  SELECT SUM(l."pointsAwarded")
  FROM "Leg" l
  INNER JOIN "Round" r ON r.id = l."roundId"
  WHERE r."groupId" = gm."groupId"
    AND l."userId" = gm."userId"
    AND r.status = 'settled'
), 0);

UPDATE "User" u
SET "totalPoints" = COALESCE((
  SELECT SUM(l."pointsAwarded")
  FROM "Leg" l
  INNER JOIN "Round" r ON r.id = l."roundId"
  WHERE l."userId" = u.id
    AND r.status = 'settled'
), 0);

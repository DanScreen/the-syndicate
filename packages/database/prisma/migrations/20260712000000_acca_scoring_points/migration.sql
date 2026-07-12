-- Acca scoring: winning round awards (combinedOdds - 1) split per member; losing round -1 each.

WITH round_stats AS (
  SELECT
    r.id AS round_id,
    r."combinedOdds",
    COUNT(l.id)::int AS leg_count,
    BOOL_AND(l.outcome IN ('won', 'void')) AS acca_won
  FROM "Round" r
  INNER JOIN "Leg" l ON l."roundId" = r.id
  WHERE r.status = 'settled'
    AND l.outcome != 'pending'
  GROUP BY r.id, r."combinedOdds"
)
UPDATE "Leg" l
SET "pointsAwarded" = CASE
  WHEN rs.acca_won THEN ROUND(CAST((COALESCE(rs."combinedOdds", 1) - 1) / rs.leg_count AS numeric), 2)
  ELSE -1
END
FROM round_stats rs
WHERE l."roundId" = rs.round_id
  AND l.outcome != 'pending';

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

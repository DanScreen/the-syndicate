-- Member acca points: won acca → odds−1 per leg; lost acca → −1 per member. Group total stays combinedOdds−1.

WITH round_stats AS (
  SELECT
    r.id AS round_id,
    BOOL_AND(l.outcome IN ('won', 'void')) AS acca_won
  FROM "Round" r
  INNER JOIN "Leg" l ON l."roundId" = r.id
  WHERE r.status = 'settled'
    AND l.outcome != 'pending'
  GROUP BY r.id
)
UPDATE "Leg" l
SET "pointsAwarded" = CASE
  WHEN rs.acca_won THEN
    CASE
      WHEN l.outcome = 'won' THEN ROUND(CAST(l.odds - 1 AS numeric), 2)
      WHEN l.outcome = 'void' THEN 0
      ELSE 0
    END
  ELSE
    CASE WHEN l.outcome = 'void' THEN 0 ELSE -1 END
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

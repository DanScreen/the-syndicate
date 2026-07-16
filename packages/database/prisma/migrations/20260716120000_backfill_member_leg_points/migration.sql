-- Backfill stored points/counts to the current per-leg scoring rule.
--
-- Each leg is scored on its OWN outcome, independent of whether the group acca
-- won: won -> odds-1, lost -> -1, void -> 0, pending -> 0. This matches
-- memberAccaLegPoints() in packages/shared/src/scoring.ts and the live
-- recompute used by the leaderboard, Performance, and the dashboard.
--
-- The previous backfill (20260712160000_member_leg_acca_points) used the older
-- rule where a lost acca scored -1 for EVERY leg, so Leg.pointsAwarded and the
-- denormalized GroupMember.points / User.totalPoints columns drifted from the
-- live values after the scoring change. This recomputes them as absolute
-- values, so it is idempotent and self-corrects on deploy.

-- 1. Per-leg points on resolved legs in settled rounds.
UPDATE "Leg" l
SET "pointsAwarded" = CASE l.outcome
  WHEN 'won' THEN ROUND(CAST(l.odds - 1 AS numeric), 2)
  WHEN 'lost' THEN -1
  ELSE 0
END
FROM "Round" r
WHERE l."roundId" = r.id
  AND r.status = 'settled'
  AND l.outcome <> 'pending';

-- 2. Per-group member totals (absolute; 0 when the member has no settled legs).
UPDATE "GroupMember" gm
SET
  "points" = COALESCE((
    SELECT ROUND(CAST(SUM(l."pointsAwarded") AS numeric), 2)
    FROM "Leg" l
    INNER JOIN "Round" r ON r.id = l."roundId"
    WHERE r."groupId" = gm."groupId"
      AND l."userId" = gm."userId"
      AND r.status = 'settled'
  ), 0),
  "legsWon" = COALESCE((
    SELECT COUNT(*)
    FROM "Leg" l
    INNER JOIN "Round" r ON r.id = l."roundId"
    WHERE r."groupId" = gm."groupId"
      AND l."userId" = gm."userId"
      AND r.status = 'settled'
      AND l.outcome = 'won'
  ), 0),
  "legsLost" = COALESCE((
    SELECT COUNT(*)
    FROM "Leg" l
    INNER JOIN "Round" r ON r.id = l."roundId"
    WHERE r."groupId" = gm."groupId"
      AND l."userId" = gm."userId"
      AND r.status = 'settled'
      AND l.outcome = 'lost'
  ), 0);

-- 3. Cross-group user totals (absolute; 0 when the user has no settled legs).
UPDATE "User" u
SET
  "totalPoints" = COALESCE((
    SELECT ROUND(CAST(SUM(l."pointsAwarded") AS numeric), 2)
    FROM "Leg" l
    INNER JOIN "Round" r ON r.id = l."roundId"
    WHERE l."userId" = u.id
      AND r.status = 'settled'
  ), 0),
  "legsWon" = COALESCE((
    SELECT COUNT(*)
    FROM "Leg" l
    INNER JOIN "Round" r ON r.id = l."roundId"
    WHERE l."userId" = u.id
      AND r.status = 'settled'
      AND l.outcome = 'won'
  ), 0),
  "legsLost" = COALESCE((
    SELECT COUNT(*)
    FROM "Leg" l
    INNER JOIN "Round" r ON r.id = l."roundId"
    WHERE l."userId" = u.id
      AND r.status = 'settled'
      AND l.outcome = 'lost'
  ), 0);

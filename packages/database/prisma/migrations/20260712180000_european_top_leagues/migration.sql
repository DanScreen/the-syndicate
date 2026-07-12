-- Replace League One / League Two admin settings with top European leagues.
DELETE FROM "CompetitionSetting"
WHERE "competitionId" IN ('league-one', 'league-two');

INSERT INTO "CompetitionSetting" ("id", "competitionId", "enabled", "updatedAt") VALUES
  ('cs_la_liga', 'la-liga', false, CURRENT_TIMESTAMP),
  ('cs_ligue_1', 'ligue-1', false, CURRENT_TIMESTAMP),
  ('cs_serie_a', 'serie-a', false, CURRENT_TIMESTAMP),
  ('cs_bundesliga', 'bundesliga', false, CURRENT_TIMESTAMP)
ON CONFLICT ("competitionId") DO NOTHING;

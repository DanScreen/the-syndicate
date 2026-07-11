-- CreateTable
CREATE TABLE "CompetitionSetting" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionSetting_competitionId_key" ON "CompetitionSetting"("competitionId");

-- Seed defaults: World Cup live for July 2026; domestic leagues off until admin enables.
INSERT INTO "CompetitionSetting" ("id", "competitionId", "enabled", "updatedAt") VALUES
  ('cs_world_cup', 'world-cup', true, CURRENT_TIMESTAMP),
  ('cs_epl', 'epl', false, CURRENT_TIMESTAMP),
  ('cs_championship', 'championship', false, CURRENT_TIMESTAMP),
  ('cs_league_one', 'league-one', false, CURRENT_TIMESTAMP),
  ('cs_league_two', 'league-two', false, CURRENT_TIMESTAMP);

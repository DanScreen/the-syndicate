-- Multi-source results (docs/specs/odds-and-results-sourcing.md Phases 1–2).

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "homeGoalsHt" INTEGER,
ADD COLUMN "awayGoalsHt" INTEGER,
ADD COLUMN "wentToExtraTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stats" JSONB,
ADD COLUMN "statsStableSince" TIMESTAMP(3),
ADD COLUMN "resultSource" TEXT,
ADD COLUMN "apiFootballCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MatchObservation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "homeGoals90" INTEGER,
    "awayGoals90" INTEGER,
    "homeGoalsEnd" INTEGER,
    "awayGoalsEnd" INTEGER,
    "homeGoalsHt" INTEGER,
    "awayGoalsHt" INTEGER,
    "extraTime" BOOLEAN NOT NULL DEFAULT false,
    "stats" JSONB,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAlias" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT,
    "alias" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchObservation_matchId_provider_key" ON "MatchObservation"("matchId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "MatchObservation_provider_externalId_key" ON "MatchObservation"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAlias_alias_canonical_key" ON "TeamAlias"("alias", "canonical");

-- AddForeignKey
ALTER TABLE "MatchObservation" ADD CONSTRAINT "MatchObservation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

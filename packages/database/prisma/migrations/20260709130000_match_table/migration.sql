-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "externalOddsId" TEXT,
    "externalDataId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Leg" ADD COLUMN "matchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalOddsId_key" ON "Match"("externalOddsId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalDataId_key" ON "Match"("externalDataId");

-- CreateIndex
CREATE INDEX "Match_competitionId_kickoff_idx" ON "Match"("competitionId", "kickoff");

-- AddForeignKey
ALTER TABLE "Leg" ADD CONSTRAINT "Leg_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

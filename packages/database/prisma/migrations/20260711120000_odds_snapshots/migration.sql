-- CreateTable
CREATE TABLE "OddsBulkSnapshot" (
    "competitionId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "regions" TEXT NOT NULL,
    "fixtures" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OddsBulkSnapshot_pkey" PRIMARY KEY ("competitionId")
);

-- CreateTable
CREATE TABLE "OddsEventSnapshot" (
    "competitionId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "markets" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OddsEventSnapshot_pkey" PRIMARY KEY ("competitionId","fixtureId","tierId")
);

-- CreateIndex
CREATE INDEX "OddsBulkSnapshot_expiresAt_idx" ON "OddsBulkSnapshot"("expiresAt");

-- CreateIndex
CREATE INDEX "OddsEventSnapshot_expiresAt_idx" ON "OddsEventSnapshot"("expiresAt");

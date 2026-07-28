-- CreateTable
CREATE TABLE "OutrightSnapshot" (
    "competitionId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "markets" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutrightSnapshot_pkey" PRIMARY KEY ("competitionId")
);

-- CreateIndex
CREATE INDEX "OutrightSnapshot_expiresAt_idx" ON "OutrightSnapshot"("expiresAt");

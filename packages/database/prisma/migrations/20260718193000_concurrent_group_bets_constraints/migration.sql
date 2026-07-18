ALTER TABLE "Group"
ADD CONSTRAINT "Group_maxActiveBets_check"
CHECK ("maxActiveBets" BETWEEN 1 AND 5);

CREATE INDEX "Round_groupId_status_createdAt_idx"
ON "Round"("groupId", "status", "createdAt");

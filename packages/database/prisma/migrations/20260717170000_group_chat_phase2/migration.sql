ALTER TABLE "GroupMember"
ADD COLUMN "lastReadMessageAt" TIMESTAMP(3);

ALTER TABLE "NotificationPreference"
ADD COLUMN "pushChat" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "GroupMember_groupId_lastReadMessageAt_idx"
ON "GroupMember"("groupId", "lastReadMessageAt");

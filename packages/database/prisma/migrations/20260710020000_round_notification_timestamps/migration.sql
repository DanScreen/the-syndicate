-- AlterTable
ALTER TABLE "Round" ADD COLUMN "lockedNotificationSentAt" TIMESTAMP(3),
ADD COLUMN "settledNotificationSentAt" TIMESTAMP(3);

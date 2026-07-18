ALTER TABLE "AnalyticsEvent" ADD COLUMN "channel" TEXT;

-- Existing page views came exclusively from the web renderer. Historical
-- login events are intentionally left null because web and mobile were mixed.
UPDATE "AnalyticsEvent"
SET "channel" = 'web'
WHERE "type" = 'page_view';

ALTER TABLE "AnalyticsEvent"
ADD CONSTRAINT "AnalyticsEvent_channel_check"
CHECK ("channel" IS NULL OR "channel" IN ('web', 'mobile'));

CREATE INDEX "AnalyticsEvent_userId_channel_createdAt_idx"
ON "AnalyticsEvent"("userId", "channel", "createdAt");

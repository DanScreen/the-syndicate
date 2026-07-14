import { prisma } from "@tiki-acca/database";
import type { AnalyticsEventType } from "@tiki-acca/shared";

type RecordEventInput = {
  type: AnalyticsEventType;
  userId?: string | null;
  path?: string | null;
};

export async function recordAnalyticsEvent(input: RecordEventInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? undefined,
        path: input.path ?? undefined,
      },
    });
  } catch (err) {
    console.error("[analytics] failed to record event", input.type, err);
  }
}

export function recordAnalyticsEventAsync(input: RecordEventInput): void {
  void recordAnalyticsEvent(input);
}

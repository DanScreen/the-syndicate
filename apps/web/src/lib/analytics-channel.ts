import type { AnalyticsChannel } from "@tiki-acca/shared";

export function analyticsChannelFromAuthorization(
  authorization: string | null
): AnalyticsChannel {
  return authorization?.startsWith("Bearer ") ? "mobile" : "web";
}

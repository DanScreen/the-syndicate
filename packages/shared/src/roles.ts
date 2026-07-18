export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "app_open",
  "visit",
  "login",
  "sign_up",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const ANALYTICS_CHANNELS = ["web", "mobile"] as const;
export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

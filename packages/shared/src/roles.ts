export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ANALYTICS_EVENT_TYPES = ["page_view", "login", "sign_up"] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

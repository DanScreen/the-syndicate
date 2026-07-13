export const NOTIFICATION_TYPES = [
  "pick_reminder",
  "round_locked",
  "round_settled",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationChannel = "email" | "push";

export type NotificationPreferences = {
  emailPickReminder: boolean;
  emailRoundLocked: boolean;
  emailRoundSettled: boolean;
  pushPickReminder: boolean;
  pushRoundLocked: boolean;
  pushRoundSettled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailPickReminder: true,
  emailRoundLocked: true,
  emailRoundSettled: true,
  pushPickReminder: true,
  pushRoundLocked: true,
  pushRoundSettled: true,
};

export function emailPrefKey(
  type: NotificationType
): keyof NotificationPreferences {
  switch (type) {
    case "pick_reminder":
      return "emailPickReminder";
    case "round_locked":
      return "emailRoundLocked";
    case "round_settled":
      return "emailRoundSettled";
  }
}

export function pushPrefKey(
  type: NotificationType
): keyof NotificationPreferences {
  switch (type) {
    case "pick_reminder":
      return "pushPickReminder";
    case "round_locked":
      return "pushRoundLocked";
    case "round_settled":
      return "pushRoundSettled";
  }
}

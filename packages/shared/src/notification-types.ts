export const NOTIFICATION_TYPES = [
  "pick_reminder",
  "round_locked",
  "round_settled",
  "chat_message",
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
  pushChat: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailPickReminder: true,
  emailRoundLocked: true,
  emailRoundSettled: true,
  pushPickReminder: true,
  pushRoundLocked: true,
  pushRoundSettled: true,
  pushChat: true,
};

export function emailPrefKey(
  type: NotificationType
): keyof NotificationPreferences | null {
  switch (type) {
    case "pick_reminder":
      return "emailPickReminder";
    case "round_locked":
      return "emailRoundLocked";
    case "round_settled":
      return "emailRoundSettled";
    case "chat_message":
      return null;
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
    case "chat_message":
      return "pushChat";
  }
}

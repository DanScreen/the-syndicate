import { api } from "@/api/client";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function expoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

export class PushRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushRegistrationError";
  }
}

export async function registerForPushNotifications(
  authToken: string
): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  // NotificationPermissionsStatus extends expo's PermissionResponse, whose
  // types don't resolve in this workspace — cast to the fields we use.
  type PermissionLike = { granted?: boolean; status?: string };
  const existing = (await Notifications.getPermissionsAsync()) as PermissionLike;
  let granted = existing.granted ?? existing.status === "granted";
  if (!granted) {
    const requested = (await Notifications.requestPermissionsAsync()) as PermissionLike;
    granted = requested.granted ?? requested.status === "granted";
  }
  if (!granted) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Tiki Acca",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = expoProjectId();
  if (!projectId) {
    throw new PushRegistrationError(
      "EAS project ID missing — set EAS_PROJECT_ID in .env or run eas init"
    );
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data;

  await api("/api/user/push-token", {
    method: "POST",
    token: authToken,
    body: JSON.stringify({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    }),
  });

  return token;
}

export async function unregisterPushNotifications(authToken: string | null) {
  if (!authToken) return;
  try {
    await api("/api/user/push-token", {
      method: "DELETE",
      token: authToken,
      body: JSON.stringify({}),
    });
  } catch {
    /* best effort */
  }
}

export function addNotificationResponseListener(
  onNavigate: (groupId: string) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      groupId?: string;
    };
    if (data?.groupId) {
      onNavigate(data.groupId);
    }
  });
}

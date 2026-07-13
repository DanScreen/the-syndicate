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

export async function registerForPushNotifications(
  authToken: string
): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "The Syndicate",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = expoProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
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

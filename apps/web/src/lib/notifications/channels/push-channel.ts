import { prisma } from "@tiki-acca/database";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

export async function sendPushToUser(
  userId: string,
  message: Omit<ExpoPushMessage, "to">
): Promise<boolean> {
  const devices = await prisma.pushDevice.findMany({
    where: { userId },
    select: { id: true, token: true },
  });

  if (devices.length === 0) return false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const payloads: ExpoPushMessage[] = devices.map((d) => ({
    to: d.token,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: "default",
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(payloads),
    });

    if (!res.ok) {
      console.error("[push] Expo API error:", await res.text());
      return false;
    }

    const tickets = (await res.json()) as { data: ExpoPushTicket[] };
    let anyOk = false;

    for (let i = 0; i < tickets.data.length; i++) {
      const ticket = tickets.data[i];
      const device = devices[i];
      if (!ticket || !device) continue;

      if (ticket.status === "ok") {
        anyOk = true;
        await prisma.pushDevice.update({
          where: { id: device.id },
          data: { lastUsedAt: new Date() },
        });
      } else if (ticket.details?.error === "DeviceNotRegistered") {
        await prisma.pushDevice.delete({ where: { id: device.id } }).catch(() => {});
      } else {
        console.error("[push] ticket error:", ticket.message, ticket.details);
      }
    }

    return anyOk;
  } catch (err) {
    console.error("[push] send error:", err);
    return false;
  }
}

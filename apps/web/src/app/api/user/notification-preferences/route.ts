import { requireSession } from "@/lib/api-auth";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/notifications/preferences";
import { notificationPreferencesSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const prefs = await getNotificationPreferences(session!.user!.id);
  return NextResponse.json(prefs);
}

export async function PATCH(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = notificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const prefs = await upsertNotificationPreferences(session!.user!.id, parsed.data);
  return NextResponse.json(prefs);
}

import { requireCronSecret } from "@/lib/internal-auth";
import { sendPickReminders } from "@/lib/notifications/send-pick-reminders";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const result = await sendPickReminders();

  if (result.sent > 0) {
    console.info("round-reminders: sent", JSON.stringify(result));
  }

  return NextResponse.json(result);
}

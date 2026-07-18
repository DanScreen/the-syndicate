import {
  normalizeAnalyticsPath,
  recordCustomerActivity,
} from "@/lib/analytics";
import { requireSession } from "@/lib/api-auth";
import { isRateLimited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const CLIENT_EVENT_TYPES = new Set(["page_view", "app_open"]);
const EVENT_LIMIT_PER_MINUTE = 180;

export async function POST(request: Request) {
  const { session, channel, error } = await requireSession();
  if (error) return error;
  if (!session || !channel) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    isRateLimited(
      `analytics:${session.user.id}`,
      EVENT_LIMIT_PER_MINUTE,
      60 * 1000
    )
  ) {
    return NextResponse.json({ ok: true, dropped: true });
  }

  const body = await request.json().catch(() => null);
  const type = body && typeof body === "object" ? body.type : null;
  const path = body && typeof body === "object" ? body.path : null;

  if (typeof type !== "string" || !CLIENT_EVENT_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }
  if (type === "app_open" && channel !== "mobile") {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }
  if (type === "page_view" && typeof path !== "string") {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }
  const normalizedPath = normalizeAnalyticsPath(path);
  if (type === "page_view" && !normalizedPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  await recordCustomerActivity({
    type: type as "page_view" | "app_open",
    userId: session.user.id,
    channel,
    path: normalizedPath,
  });

  return NextResponse.json({ ok: true });
}

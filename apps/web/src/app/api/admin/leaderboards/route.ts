import { requireAdmin } from "@/lib/admin";
import { computePlatformLeaderboards } from "@/lib/admin/compute-platform-leaderboards";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const leaderboards = await computePlatformLeaderboards();
  return NextResponse.json(leaderboards);
}

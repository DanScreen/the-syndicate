import { requireAdmin } from "@/lib/admin";
import { warmOddsCache } from "@/lib/odds/warm-cache";
import { NextResponse } from "next/server";

/** Warm can touch every enabled competition + core markets — allow a long request. */
export const maxDuration = 300;

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  if (!process.env.ODDS_API_KEY) {
    return NextResponse.json({ error: "ODDS_API_KEY is not configured" }, { status: 503 });
  }

  try {
    const result = await warmOddsCache();
    return NextResponse.json({ warmed: result });
  } catch (err) {
    console.error("[admin] warm-odds-cache failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Warm failed" },
      { status: 500 }
    );
  }
}

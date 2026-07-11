import { requireCronSecret } from "@/lib/internal-auth";
import { warmOddsCache } from "@/lib/odds/warm-cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  if (!process.env.ODDS_API_KEY) {
    return NextResponse.json({ error: "ODDS_API_KEY is not configured" }, { status: 503 });
  }

  const result = await warmOddsCache();
  return NextResponse.json({ warmed: result });
}

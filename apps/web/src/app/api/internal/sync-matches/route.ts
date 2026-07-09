import { requireCronSecret } from "@/lib/internal-auth";
import { syncAllCompetitionMatches } from "@/lib/results/sync-matches";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const result = await syncAllCompetitionMatches();
  return NextResponse.json(result);
}

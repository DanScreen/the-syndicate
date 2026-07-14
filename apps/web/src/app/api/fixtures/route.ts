import { getFixtures } from "@/lib/odds/provider";
import { requireSession } from "@/lib/api-auth";
import { isCompetitionEnabled } from "@/lib/competitions/settings";
import { isValidCompetitionId } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const competition = new URL(request.url).searchParams.get("competition");
  if (!competition) {
    return NextResponse.json({ error: "competition query parameter is required" }, { status: 400 });
  }

  if (!isValidCompetitionId(competition)) {
    return NextResponse.json({ error: "Unknown competition" }, { status: 400 });
  }

  if (!(await isCompetitionEnabled(competition))) {
    return NextResponse.json({ error: "Competition is not available" }, { status: 403 });
  }

  const { fixtures, source, oddsConfigured } = await getFixtures(competition);
  return NextResponse.json({ fixtures, source, oddsConfigured, competitionId: competition });
}

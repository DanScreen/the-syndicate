import { getFixtures } from "@/lib/odds/provider";
import { serialized } from "@/lib/api-response";
import type { FixturesResponse } from "@tiki-acca/shared";
import { requireSession } from "@/lib/api-auth";
import { isCompetitionEnabled } from "@/lib/competitions/settings";
import { calledOffFixtureIds } from "@/lib/results/called-off-fixtures";
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

  const listed = await getFixtures(competition);
  const { source, oddsConfigured } = listed;
  // The odds cache still lists postponed matches at their original kickoff.
  const calledOff = await calledOffFixtureIds(competition, listed.fixtures);
  const fixtures = listed.fixtures.filter((f) => !calledOff.has(f.id));
  return NextResponse.json(
    serialized({
      fixtures,
      source,
      oddsConfigured,
      competitionId: competition,
    }) satisfies FixturesResponse
  );
}

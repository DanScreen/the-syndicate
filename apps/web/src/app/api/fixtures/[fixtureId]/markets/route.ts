import { getFixtureMarkets } from "@/lib/odds/provider";
import { requireSession } from "@/lib/api-auth";
import { isValidCompetitionId } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ fixtureId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const competition = new URL(request.url).searchParams.get("competition");
  if (!competition) {
    return NextResponse.json({ error: "competition query parameter is required" }, { status: 400 });
  }

  if (!isValidCompetitionId(competition)) {
    return NextResponse.json({ error: "Unknown competition" }, { status: 400 });
  }

  const { fixtureId } = await params;
  const markets = await getFixtureMarkets(fixtureId, competition);

  if (markets.length === 0) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  return NextResponse.json({ markets });
}

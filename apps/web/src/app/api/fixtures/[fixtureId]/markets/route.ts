import { requireSession } from "@/lib/api-auth";
import { isCompetitionEnabled } from "@/lib/competitions/settings";
import {
  estimateTierCredits,
  getMarketTier,
  isMarketTierId,
  MARKET_TIERS,
} from "@/lib/odds/market-tiers";
import { findFixture, getExtendedMarketsForTier } from "@/lib/odds/provider";
import { isValidCompetitionId } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ fixtureId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { error } = await requireSession();
  if (error) return error;

  const url = new URL(request.url);
  const competition = url.searchParams.get("competition");
  const tierParam = url.searchParams.get("tier") ?? "core";

  if (!competition) {
    return NextResponse.json({ error: "competition query parameter is required" }, { status: 400 });
  }

  if (!isValidCompetitionId(competition)) {
    return NextResponse.json({ error: "Unknown competition" }, { status: 400 });
  }

  if (!(await isCompetitionEnabled(competition))) {
    return NextResponse.json({ error: "Competition is not available" }, { status: 403 });
  }

  if (!isMarketTierId(tierParam)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const { fixtureId } = await params;
  const fixture = await findFixture(fixtureId, competition);
  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  const markets = await getExtendedMarketsForTier(fixtureId, competition, tierParam);
  const tier = getMarketTier(tierParam);

  return NextResponse.json({
    markets,
    tier: tierParam,
    tierCredits: estimateTierCredits(tier),
    tiers: MARKET_TIERS.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      credits: estimateTierCredits(t),
    })),
  });
}

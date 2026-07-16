import { requireSession } from "@/lib/api-auth";
import { isBookmakerHubUrl } from "@/lib/odds/betslip-links";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { lockRoundWithAccaPricing } from "@/lib/odds/lock-round";
import { findSelection } from "@/lib/odds/provider";
import { bookmakerLinksFromQuotes } from "@/lib/odds/quotes";
import { isCompetitionEnabled } from "@/lib/competitions/settings";
import { firstKickoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@tiki-acca/database";
import {
  editLegSchema,
  findConflictingMarketLeg,
  formatMarketConflictError,
  getCompetitionById,
} from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: legId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = editLegSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const leg = await prisma.leg.findUnique({
    where: { id: legId },
    include: { round: { include: { legs: true } } },
  });

  if (!leg) {
    return NextResponse.json({ error: "Leg not found" }, { status: 404 });
  }

  if (leg.userId !== session!.user!.id) {
    return NextResponse.json({ error: "You can only edit your own leg" }, { status: 403 });
  }

  const round = leg.round;
  if (round.status !== "open" && round.status !== "locked") {
    return NextResponse.json({ error: "Round is already settled" }, { status: 400 });
  }

  const cutoff = firstKickoff(round.legs);
  if (cutoff && new Date() >= cutoff) {
    return NextResponse.json(
      { error: "Editing is closed. The first match in this acca has kicked off." },
      { status: 403 }
    );
  }

  const competition = getCompetitionById(parsed.data.competitionId);
  if (!competition) {
    return NextResponse.json({ error: "Unknown competition" }, { status: 400 });
  }

  if (!(await isCompetitionEnabled(parsed.data.competitionId))) {
    return NextResponse.json({ error: "Competition is not available" }, { status: 403 });
  }

  const selectionData = await findSelection(
    parsed.data.fixtureId,
    parsed.data.marketType,
    parsed.data.selectionId,
    parsed.data.competitionId
  );

  if (!selectionData) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }

  const { fixture, market, selection } = selectionData;

  if (new Date(fixture.kickoff) <= new Date()) {
    return NextResponse.json({ error: "That fixture has already kicked off" }, { status: 400 });
  }

  const marketConflict = findConflictingMarketLeg(
    round.legs,
    { fixtureId: fixture.id, marketType: market.type },
    leg.id
  );
  if (marketConflict) {
    return NextResponse.json(
      { error: formatMarketConflictError(marketConflict) },
      { status: 409 }
    );
  }

  const quote = sortQuotesByBestOdds(selection.odds)[0];
  if (!quote) {
    return NextResponse.json({ error: "No odds available for this selection" }, { status: 400 });
  }

  const bookmakerLinks = bookmakerLinksFromQuotes(selection.odds);
  const betslipUrl =
    quote.link && !isBookmakerHubUrl(quote.link) ? quote.link : bookmakerLinks[quote.bookmakerId] ?? null;

  // Snapshot the previous pick so a failed reprice can restore it.
  const previous = {
    fixtureId: leg.fixtureId,
    homeTeam: leg.homeTeam,
    awayTeam: leg.awayTeam,
    competitionId: leg.competitionId,
    competition: leg.competition,
    matchId: leg.matchId,
    kickoff: leg.kickoff,
    marketType: leg.marketType,
    marketLabel: leg.marketLabel,
    selectionId: leg.selectionId,
    selectionLabel: leg.selectionLabel,
    odds: leg.odds,
    bookmakerId: leg.bookmakerId,
    bookmakerName: leg.bookmakerName,
    betslipUrl: leg.betslipUrl,
    bookmakerLinks: leg.bookmakerLinks ?? undefined,
  };

  const updatedLeg = await prisma.leg.update({
    where: { id: leg.id },
    data: {
      fixtureId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      competitionId: competition.id,
      competition: competition.name,
      matchId: null,
      kickoff: new Date(fixture.kickoff),
      marketType: market.type,
      marketLabel: market.label,
      selectionId: selection.id,
      selectionLabel: selection.label,
      odds: quote.odds,
      bookmakerId: quote.bookmakerId,
      bookmakerName: quote.bookmakerName,
      betslipUrl,
      bookmakerLinks: Object.keys(bookmakerLinks).length > 0 ? bookmakerLinks : undefined,
      outcome: "pending",
    },
    include: { user: { select: { name: true } } },
  });

  // A locked acca changes shape when a leg changes — reprice the whole thing.
  // Re-read the status: the round may have locked (final member submitted)
  // between our earlier check and the leg update.
  const currentRound = await prisma.round.findUnique({
    where: { id: round.id },
    select: { status: true },
  });
  const repriced = currentRound?.status === "locked";

  if (repriced) {
    try {
      const legs = await prisma.leg.findMany({ where: { roundId: round.id } });
      await lockRoundWithAccaPricing(round.id, legs);
    } catch (err) {
      // Restore the previous pick so the acca stays priceable.
      await prisma.leg.update({ where: { id: leg.id }, data: previous });
      console.error("[legs] reprice after edit failed", err);
      return NextResponse.json(
        { error: "Could not reprice the acca with that pick. Please try a different selection." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ leg: updatedLeg, repriced });
}

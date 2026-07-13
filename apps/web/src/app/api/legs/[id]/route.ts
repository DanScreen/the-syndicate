import { requireSession } from "@/lib/api-auth";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { lockRoundWithAccaPricing } from "@/lib/odds/lock-round";
import { findSelection } from "@/lib/odds/provider";
import { isCompetitionEnabled } from "@/lib/competitions/settings";
import { prisma } from "@the-syndicate/database";
import { getCompetitionById, editLegSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Earliest kickoff across the round's legs — editing closes when the first match starts. */
function firstKickoff(legs: { kickoff: Date }[]): Date | null {
  if (legs.length === 0) return null;
  return legs.reduce((min, l) => (l.kickoff < min ? l.kickoff : min), legs[0]!.kickoff);
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: legId } = await params;
  const body = await request.json();
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
      { error: "Editing is closed — the first match in this acca has kicked off" },
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

  const quote = sortQuotesByBestOdds(selection.odds)[0];
  if (!quote) {
    return NextResponse.json({ error: "No odds available for this selection" }, { status: 400 });
  }

  const bookmakerLinks = Object.fromEntries(
    selection.odds.filter((q) => q.link).map((q) => [q.bookmakerId, q.link!])
  );

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
      betslipUrl: quote.link ?? null,
      bookmakerLinks: Object.keys(bookmakerLinks).length > 0 ? bookmakerLinks : undefined,
      outcome: "pending",
    },
    include: { user: { select: { name: true } } },
  });

  // A locked acca changes shape when a leg changes — reprice the whole thing.
  if (round.status === "locked") {
    try {
      const legs = await prisma.leg.findMany({ where: { roundId: round.id } });
      await lockRoundWithAccaPricing(round.id, legs);
    } catch (err) {
      // Restore the previous pick so the acca stays priceable.
      await prisma.leg.update({ where: { id: leg.id }, data: previous });
      console.error("[legs] reprice after edit failed", err);
      return NextResponse.json(
        { error: "Could not reprice the acca with that pick — please try a different selection" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ leg: updatedLeg, repriced: round.status === "locked" });
}

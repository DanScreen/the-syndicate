import { requireSession } from "@/lib/api-auth";
import { isBookmakerHubUrl } from "@/lib/odds/betslip-links";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { findSelection } from "@/lib/odds/provider";
import { bookmakerLinksFromQuotes } from "@/lib/odds/quotes";
import { isCompetitionEnabled } from "@/lib/competitions/settings";
import { claimAndLockRound } from "@/lib/rounds/claim-lock-round";
import { isPastKickoffCutoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@tiki-acca/database";
import {
  allMembersFilledQuota,
  findConflictingMarketLeg,
  formatMarketConflictError,
  getCompetitionById,
  nextLegIndexForUser,
  submitLegSchema,
} from "@tiki-acca/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = submitLegSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const round = await prisma.round.findUnique({
    where: { id: parsed.data.roundId },
    include: {
      group: { include: { members: true } },
      legs: true,
    },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (round.status !== "open") {
    return NextResponse.json({ error: "Round is not accepting legs" }, { status: 400 });
  }

  if (round.legs.length > 0 && isPastKickoffCutoff(round.legs)) {
    try {
      await claimAndLockRound(round.id);
    } catch (err) {
      console.error("[legs] kickoff lock on submit failed", round.id, err);
    }
    return NextResponse.json(
      { error: "This acca locked at the first kickoff. You missed this round." },
      { status: 403 }
    );
  }

  const isMember = round.group.members.some((m) => m.userId === session!.user!.id);
  if (!isMember) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }

  const quota = round.legsPerMember;
  const userLegs = round.legs.filter((l) => l.userId === session!.user!.id);
  if (userLegs.length >= quota) {
    return NextResponse.json(
      {
        error:
          quota === 1
            ? "You already submitted a leg"
            : `You've already submitted all ${quota} legs for this round`,
      },
      { status: 409 }
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

  const marketConflict = findConflictingMarketLeg(round.legs, {
    fixtureId: fixture.id,
    marketType: market.type,
  });
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

  const legIndex = nextLegIndexForUser(round.legs, session!.user!.id);

  const leg = await prisma.leg.create({
    data: {
      roundId: round.id,
      userId: session!.user!.id,
      legIndex,
      fixtureId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      competitionId: competition.id,
      competition: competition.name,
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
    },
    include: { user: { select: { name: true } } },
  });

  const updatedRound = await prisma.round.findUnique({
    where: { id: round.id },
    include: { legs: true, group: { include: { members: true } } },
  });

  const shouldLock =
    updatedRound &&
    allMembersFilledQuota({
      memberUserIds: updatedRound.group.members.map((m) => m.userId),
      legs: updatedRound.legs,
      legsPerMember: updatedRound.legsPerMember,
    });

  if (shouldLock) {
    try {
      await claimAndLockRound(round.id);
    } catch (err) {
      console.error("[legs] lock on final submit failed", round.id, err);
      throw err;
    }
  }

  const lockedRound = await prisma.round.findUnique({
    where: { id: round.id },
    select: { status: true },
  });

  return NextResponse.json({
    leg,
    locked: lockedRound?.status === "locked",
  });
}

import { requireSession } from "@/lib/api-auth";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { lockRoundWithAccaPricing } from "@/lib/odds/lock-round";
import { findSelection } from "@/lib/odds/provider";
import { notifyRoundLocked } from "@/lib/notifications/round-notifications";
import { isCompetitionEnabled } from "@/lib/competitions/settings";
import { prisma } from "@the-syndicate/database";
import { getCompetitionById, submitLegSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
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

  if (round.status !== "collecting") {
    return NextResponse.json({ error: "Round is not accepting legs" }, { status: 400 });
  }

  const isMember = round.group.members.some((m) => m.userId === session!.user!.id);
  if (!isMember) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }

  const existingLeg = round.legs.find((l) => l.userId === session!.user!.id);
  if (existingLeg) {
    return NextResponse.json({ error: "You already submitted a leg" }, { status: 409 });
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
  const quote = sortQuotesByBestOdds(selection.odds)[0];
  if (!quote) {
    return NextResponse.json({ error: "No odds available for this selection" }, { status: 400 });
  }

  const bookmakerLinks = Object.fromEntries(
    selection.odds.filter((q) => q.link).map((q) => [q.bookmakerId, q.link!])
  );

  const leg = await prisma.leg.create({
    data: {
      roundId: round.id,
      userId: session!.user!.id,
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
      betslipUrl: quote.link ?? null,
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
    updatedRound.legs.length >= updatedRound.group.members.length;

  if (shouldLock) {
    // Atomically claim the lock so that when two members submit the final legs
    // at once, only one request reprices the acca (which costs Odds API
    // credits) and sends the "locked" email. The loser's round is already
    // being locked by the winner.
    const claim = await prisma.round.updateMany({
      where: { id: round.id, status: "collecting" },
      data: { status: "locked" },
    });

    if (claim.count === 1) {
      try {
        await lockRoundWithAccaPricing(round.id, updatedRound!.legs);
      } catch (err) {
        // Repricing failed — revert so members can retry the final leg.
        await prisma.round.updateMany({
          where: { id: round.id, status: "locked" },
          data: { status: "collecting" },
        });
        throw err;
      }

      await prisma.group.update({
        where: { id: round.groupId },
        data: { status: "locked" },
      });

      void notifyRoundLocked(round.id);
    }
  }

  return NextResponse.json({
    leg,
    locked: Boolean(shouldLock),
  });
}

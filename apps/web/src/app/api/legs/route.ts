import { requireSession } from "@/lib/api-auth";
import { findBestBookmaker } from "@/lib/odds/betslip-links";
import { findSelection } from "@/lib/odds/provider";
import { prisma } from "@the-syndicate/database";
import { submitLegSchema } from "@the-syndicate/shared";
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

  const selectionData = await findSelection(
    parsed.data.fixtureId,
    parsed.data.marketType,
    parsed.data.selectionId
  );

  if (!selectionData) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }

  const { fixture, market, selection } = selectionData;
  const quote = selection.odds.find((o) => o.bookmakerId === parsed.data.bookmakerId);
  if (!quote) {
    return NextResponse.json({ error: "Bookmaker odds not found" }, { status: 400 });
  }

  const leg = await prisma.leg.create({
    data: {
      roundId: round.id,
      userId: session!.user!.id,
      fixtureId: fixture.id,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      competition: fixture.competition,
      kickoff: new Date(fixture.kickoff),
      marketType: market.type,
      marketLabel: market.label,
      selectionId: selection.id,
      selectionLabel: selection.label,
      odds: quote.odds,
      bookmakerId: quote.bookmakerId,
      bookmakerName: quote.bookmakerName,
    },
    include: { user: { select: { name: true } } },
  });

  const updatedRound = await prisma.round.findUnique({
    where: { id: round.id },
    include: { legs: true, group: { include: { members: true } } },
  });

  if (
    updatedRound &&
    updatedRound.legs.length >= updatedRound.group.members.length
  ) {
    const best = findBestBookmaker(
      updatedRound.legs.map((l) => ({ bookmakerId: l.bookmakerId, odds: l.odds }))
    );

    await prisma.round.update({
      where: { id: round.id },
      data: {
        status: "locked",
        combinedOdds: best.combinedOdds,
        bestBookmakerId: best.bookmakerId,
        lockedAt: new Date(),
      },
    });

    await prisma.group.update({
      where: { id: round.groupId },
      data: { status: "locked" },
    });
  }

  return NextResponse.json({ leg, locked: updatedRound!.legs.length >= updatedRound!.group.members.length });
}

import { requireSession } from "@/lib/api-auth";
import { getMatchResultForLeg, fetchMatchesForLegs } from "@/lib/results/football-data";
import { resolveLegOutcome } from "@/lib/results/resolve-leg";
import { applyRoundSettlement } from "@/lib/settlement/apply-round-settlement";
import { prisma } from "@the-syndicate/database";
import type { LegOutcome } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: roundId } = await params;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: true,
      group: { include: { members: true } },
    },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const membership = round.group.members.find((m) => m.userId === session!.user!.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only owner can settle" }, { status: 403 });
  }

  if (round.status !== "locked") {
    return NextResponse.json({ error: "Round must be locked first" }, { status: 400 });
  }

  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return NextResponse.json(
      {
        error:
          "FOOTBALL_DATA_API_KEY is not configured. Add it to enable automatic settlement.",
      },
      { status: 503 }
    );
  }

  const outcomeMap = new Map<string, LegOutcome>();
  const pending: { legId: string; reason: string }[] = [];

  const matches = await fetchMatchesForLegs(round.legs);

  for (const leg of round.legs) {
    const matchResult = await getMatchResultForLeg(
      {
        homeTeam: leg.homeTeam,
        awayTeam: leg.awayTeam,
        kickoff: leg.kickoff,
      },
      matches
    );

    if (!matchResult) {
      pending.push({
        legId: leg.id,
        reason: `No match found for ${leg.homeTeam} vs ${leg.awayTeam}`,
      });
      continue;
    }

    const outcome = resolveLegOutcome(
      { marketType: leg.marketType, selectionId: leg.selectionId },
      matchResult
    );

    if (!outcome) {
      pending.push({
        legId: leg.id,
        reason: `Match not finished (${matchResult.status})`,
      });
      continue;
    }

    outcomeMap.set(leg.id, outcome);
  }

  if (pending.length > 0) {
    return NextResponse.json(
      {
        error: "Not all legs can be settled yet",
        pending,
        resolved: Object.fromEntries(outcomeMap),
      },
      { status: 409 }
    );
  }

  const result = await applyRoundSettlement(roundId, outcomeMap);

  return NextResponse.json({
    ...result,
    legOutcomes: Object.fromEntries(outcomeMap),
  });
}

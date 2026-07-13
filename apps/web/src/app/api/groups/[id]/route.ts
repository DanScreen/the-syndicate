import { requireSession } from "@/lib/api-auth";
import { buildRoundBetslipLinks } from "@/lib/odds/betslip-links";
import { computeAccaRankingsForLegs } from "@/lib/odds/lock-round";
import { lockOpenRoundsAtKickoff } from "@/lib/rounds/lock-open-rounds-at-kickoff";
import { openRound } from "@/lib/rounds/open-round";
import { prisma } from "@the-syndicate/database";
import type { AccaBookmakerRanking } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: id, userId: session!.user!.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      members: {
        include: {
          user: {
            select: { id: true, name: true, totalPoints: true, legsWon: true, legsLost: true },
          },
        },
        orderBy: { points: "desc" },
      },
      rounds: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          legs: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  let activeRound = group.rounds.find((r) => r.status !== "settled") ?? null;

  if (!activeRound) {
    const created = await openRound(id);
    activeRound = { ...created, legs: [] };
    group.status = "open";
  } else if (activeRound.status === "open") {
    await lockOpenRoundsAtKickoff();
    const refreshed = await prisma.round.findUnique({
      where: { id: activeRound.id },
      include: {
        legs: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (refreshed) activeRound = refreshed;
  }

  let accaBookmakerRankings: AccaBookmakerRanking[] | null = null;
  let betslipLinks = null;
  let betslipLink: string | null = null;

  if (activeRound?.status === "locked" && activeRound.legs.length > 0) {
    const stored = activeRound.accaBookmakerRankings as AccaBookmakerRanking[] | null;
    const rankings =
      stored && stored.length > 0
        ? stored
        : await computeAccaRankingsForLegs(activeRound.legs);

    betslipLinks = buildRoundBetslipLinks(
      activeRound.legs,
      rankings,
      activeRound.bestBookmakerId
    );

    accaBookmakerRankings = betslipLinks.rankedLinks.map((r) => ({
      bookmakerId: r.bookmakerId,
      bookmakerName: r.bookmakerName,
      combinedOdds: r.combinedOdds,
      url: r.url,
      hasAllLegLinks: r.hasAllLegLinks,
    }));

    betslipLink = betslipLinks.primaryLink;
  }

  const leaderboard = group.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    points: m.points,
    legsWon: m.legsWon,
    legsLost: m.legsLost,
    role: m.role,
  }));

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      status: activeRound?.status ?? group.status,
      owner: group.owner,
      memberCount: group.members.length,
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        role: m.role,
      })),
    },
    leaderboard,
    activeRound: activeRound
      ? { ...activeRound, accaBookmakerRankings }
      : null,
    betslipLink,
    betslipLinks,
    isOwner: membership.role === "owner",
    recentRounds: group.rounds
      .filter((r) => r.status === "settled")
      .map((r) => ({
        id: r.id,
        status: r.status,
        combinedOdds: r.combinedOdds,
        legs: r.legs.map((leg) => ({
          selectionLabel: leg.selectionLabel,
          outcome: leg.outcome,
          odds: leg.odds,
          pointsAwarded: leg.pointsAwarded,
        })),
      })),
  });
}

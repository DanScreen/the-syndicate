import { requireSession } from "@/lib/api-auth";
import { mapHistoryRound } from "@/lib/groups/map-history-round";
import { buildRoundBetslipLinks } from "@/lib/odds/betslip-links";
import {
  computeAccaRankingsForLegs,
  mergeLegBookmakerLinks,
} from "@/lib/odds/lock-round";
import { lockOpenRoundsAtKickoff } from "@/lib/rounds/lock-open-rounds-at-kickoff";
import { openRound } from "@/lib/rounds/open-round";
import { prisma } from "@tiki-acca/database";
import type { AccaBookmakerRanking } from "@tiki-acca/shared";
import { updateGroupSettingsSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const recentRoundInclude = {
  legs: {
    include: { user: { select: { id: true, name: true } } },
  },
} as const;

function rankedLinksForClient(
  betslip: ReturnType<typeof buildRoundBetslipLinks>
): AccaBookmakerRanking[] {
  return betslip.rankedLinks.map((r) => ({
    bookmakerId: r.bookmakerId,
    bookmakerName: r.bookmakerName,
    combinedOdds: r.combinedOdds,
    url: r.url,
    hasAllLegLinks: r.hasAllLegLinks,
    linkQuality: r.linkQuality,
  }));
}

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
        where: { status: { in: ["open", "locked"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: recentRoundInclude,
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  let activeRound = group.rounds[0] ?? null;

  if (!activeRound) {
    const created = await openRound(id);
    activeRound = { ...created, legs: [] };
    group.status = "open";
  } else if (activeRound.status === "open") {
    await lockOpenRoundsAtKickoff();
    const refreshed = await prisma.round.findUnique({
      where: { id: activeRound.id },
      include: recentRoundInclude,
    });
    if (refreshed) activeRound = refreshed;
  }

  const recentSettled = await prisma.round.findMany({
    where: { groupId: id, status: "settled" },
    orderBy: [{ settledAt: "desc" }, { createdAt: "desc" }],
    take: 3,
    include: recentRoundInclude,
  });

  let accaBookmakerRankings: AccaBookmakerRanking[] | null = null;
  let betslipLinks = null;
  let betslipLink: string | null = null;
  let previewCombinedOdds: number | null = null;
  let previewBestBookmakerId: string | null = null;

  if (activeRound && activeRound.legs.length > 0) {
    const { rankings: computedRankings, bookmakerLinksByLegId } =
      await computeAccaRankingsForLegs(activeRound.legs);
    const legsForLinks = mergeLegBookmakerLinks(activeRound.legs, bookmakerLinksByLegId);

    if (activeRound.status === "locked") {
      const stored = activeRound.accaBookmakerRankings as AccaBookmakerRanking[] | null;
      const rankings =
        stored && stored.length > 0 ? stored : computedRankings;

      betslipLinks = buildRoundBetslipLinks(
        legsForLinks,
        rankings,
        activeRound.bestBookmakerId
      );

      accaBookmakerRankings = rankedLinksForClient(betslipLinks);
      betslipLink = betslipLinks.primaryLink;
    } else if (activeRound.status === "open" && computedRankings.length > 0) {
      // Live preview from current submitted legs — not persisted until lock.
      previewBestBookmakerId = computedRankings[0]!.bookmakerId;
      previewCombinedOdds = computedRankings[0]!.combinedOdds;
      betslipLinks = buildRoundBetslipLinks(
        legsForLinks,
        computedRankings,
        previewBestBookmakerId
      );
      accaBookmakerRankings = rankedLinksForClient(betslipLinks);
      betslipLink = betslipLinks.primaryLink;
    }
  }

  const leaderboard = group.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    points: m.points,
    legsWon: m.legsWon,
    legsLost: m.legsLost,
    role: m.role,
  }));

  const sortedActiveLegs = activeRound
    ? [...activeRound.legs].sort((a, b) => {
        if (a.userId !== b.userId) {
          return a.user.name.localeCompare(b.user.name);
        }
        return a.legIndex - b.legIndex;
      })
    : [];

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      status: activeRound?.status ?? group.status,
      legsPerMember: group.legsPerMember,
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
      ? {
          ...activeRound,
          legs: sortedActiveLegs,
          legsPerMember: activeRound.legsPerMember,
          combinedOdds:
            activeRound.status === "open" && previewCombinedOdds != null
              ? previewCombinedOdds
              : activeRound.combinedOdds,
          bestBookmakerId:
            activeRound.status === "open" && previewBestBookmakerId
              ? previewBestBookmakerId
              : activeRound.bestBookmakerId,
          accaBookmakerRankings,
        }
      : null,
    betslipLink,
    betslipLinks,
    isOwner: membership.role === "owner",
    recentRounds: recentSettled.map(mapHistoryRound),
  });
}

/** Owner updates group settings. `legsPerMember` applies to future rounds only. */
export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateGroupSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: id, userId: session!.user!.id },
    },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only the group owner can change settings" }, { status: 403 });
  }

  const group = await prisma.group.update({
    where: { id },
    data: { legsPerMember: parsed.data.legsPerMember },
    select: {
      id: true,
      name: true,
      legsPerMember: true,
    },
  });

  return NextResponse.json({
    group,
    note: "Legs per member applies to the next open round (after the current acca settles).",
  });
}

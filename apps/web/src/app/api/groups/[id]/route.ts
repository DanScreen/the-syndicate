import { requireSession } from "@/lib/api-auth";
import { mapHistoryRound } from "@/lib/groups/map-history-round";
import { buildRoundBetslipLinks } from "@/lib/odds/betslip-links";
import {
  computeAccaRankingsForLegs,
  mergeLegBookmakerLinks,
} from "@/lib/odds/lock-round";
import { purgeDuplicateMarketsInRound } from "@/lib/legs/purge-duplicate-markets";
import { claimAndLockRound } from "@/lib/rounds/claim-lock-round";
import { isPastKickoffCutoff } from "@/lib/rounds/first-kickoff";
import { lockOpenRoundsAtKickoff } from "@/lib/rounds/lock-open-rounds-at-kickoff";
import { openRound } from "@/lib/rounds/open-round";
import { memberNetPointsAcrossRounds } from "@/lib/stats/helpers";
import { prisma } from "@tiki-acca/database";
import { Prisma } from "@prisma/client";
import type { AccaBookmakerRanking } from "@tiki-acca/shared";
import {
  allMembersFilledQuota,
  countLegsByUser,
  updateGroupSettingsSchema,
} from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const recentRoundInclude = {
  legs: {
    include: { user: { select: { id: true, name: true } } },
  },
} as const;

type ActiveRoundRecord = Prisma.RoundGetPayload<{
  include: typeof recentRoundInclude;
}>;

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

async function activeRoundForClient(round: ActiveRoundRecord) {
  let accaBookmakerRankings: AccaBookmakerRanking[] | null = null;
  let betslipLinks = null;
  let betslipLink: string | null = null;
  let previewCombinedOdds: number | null = null;
  let previewBestBookmakerId: string | null = null;

  if (round.legs.length > 0) {
    const { rankings: computedRankings, bookmakerLinksByLegId } =
      await computeAccaRankingsForLegs(round.legs);
    const legsForLinks = mergeLegBookmakerLinks(
      round.legs,
      bookmakerLinksByLegId
    );

    if (round.status === "locked") {
      const stored = round.accaBookmakerRankings as AccaBookmakerRanking[] | null;
      const rankings =
        stored && stored.length > 0 ? stored : computedRankings;
      betslipLinks = buildRoundBetslipLinks(
        legsForLinks,
        rankings,
        round.bestBookmakerId
      );
      accaBookmakerRankings = rankedLinksForClient(betslipLinks);
      betslipLink = betslipLinks.primaryLink;
    } else if (round.status === "open" && computedRankings.length > 0) {
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

  const legs = [...round.legs].sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.user.name.localeCompare(b.user.name);
    }
    return a.legIndex - b.legIndex;
  });

  return {
    ...round,
    legs,
    combinedOdds:
      round.status === "open" && previewCombinedOdds != null
        ? previewCombinedOdds
        : round.combinedOdds,
    bestBookmakerId:
      round.status === "open" && previewBestBookmakerId
        ? previewBestBookmakerId
        : round.bestBookmakerId,
    accaBookmakerRankings,
    betslipLink,
    betslipLinks,
  };
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
        include: recentRoundInclude,
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  let activeRounds = group.rounds;

  if (activeRounds.length === 0) {
    await openRound(id);
    activeRounds = await prisma.round.findMany({
      where: { groupId: id, status: { in: ["open", "locked"] } },
      orderBy: { createdAt: "desc" },
      include: recentRoundInclude,
    });
    group.status = "open";
  } else if (activeRounds.some((round) => round.status === "open")) {
    await lockOpenRoundsAtKickoff();
    activeRounds = await prisma.round.findMany({
      where: { groupId: id, status: { in: ["open", "locked"] } },
      orderBy: { createdAt: "desc" },
      include: recentRoundInclude,
    });

    // Final-submit locks can fail if live odds vanished (fixture kicked off /
    // feed gap). Retry each eligible open bet on load.
    for (const round of activeRounds) {
      if (
        round.status !== "open" ||
        !allMembersFilledQuota({
          memberUserIds: group.members.map((m) => m.userId),
          legs: round.legs,
          legsPerMember: round.legsPerMember,
        })
      ) {
        continue;
      }
      try {
        await claimAndLockRound(round.id);
      } catch (err) {
        console.error("[groups] retry lock on load failed", round.id, err);
      }
    }

    activeRounds = await prisma.round.findMany({
      where: { groupId: id, status: { in: ["open", "locked"] } },
      orderBy: { createdAt: "desc" },
      include: recentRoundInclude,
    });
  }

  // Drop duplicate market-family legs from open / pre-kickoff locked rounds
  // that were submitted before the uniqueness rule shipped.
  let purgedAny = false;
  for (const round of activeRounds) {
    if (round.legs.length <= 1) continue;
    const purged = await purgeDuplicateMarketsInRound(round.id);
    if (purged.removedLegIds.length > 0) {
      purgedAny = true;
    }
  }
  if (purgedAny) {
    activeRounds = await prisma.round.findMany({
      where: { groupId: id, status: { in: ["open", "locked"] } },
      orderBy: { createdAt: "desc" },
      include: recentRoundInclude,
    });
  }

  const [recentSettled, settledForLeaderboard] = await Promise.all([
    prisma.round.findMany({
      where: { groupId: id, status: "settled" },
      orderBy: [{ settledAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: recentRoundInclude,
    }),
    prisma.round.findMany({
      where: { groupId: id, status: "settled" },
      include: { legs: true },
    }),
  ]);

  const activeRoundViews = await Promise.all(
    activeRounds.map(activeRoundForClient)
  );
  activeRoundViews.sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    return (b.betNumber ?? 0) - (a.betNumber ?? 0);
  });
  const activeRound = activeRoundViews[0] ?? null;

  // Live points (same rules as Performance) — denormalized GroupMember.points
  // can be stale after scoring rule changes / equal-split backfills.
  const leaderboard = group.members
    .map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      points: memberNetPointsAcrossRounds(settledForLeaderboard, m.user.id),
      legsWon: m.legsWon,
      legsLost: m.legsLost,
      role: m.role,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const unreadSince =
    membership.lastReadMessageAt && membership.lastReadMessageAt > membership.joinedAt
      ? membership.lastReadMessageAt
      : membership.joinedAt;
  const unreadMessageCount = await prisma.roundMessage.count({
    where: {
      round: { groupId: id },
      createdAt: { gt: unreadSince },
      OR: [
        { userId: null },
        { userId: { not: session!.user!.id } },
      ],
    },
  });

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      status: activeRound?.status ?? group.status,
      legsPerMember: group.legsPerMember,
      maxActiveBets: group.maxActiveBets,
      owner: group.owner,
      memberCount: group.members.length,
      unreadMessageCount,
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        role: m.role,
      })),
    },
    leaderboard,
    activeRound,
    activeRounds: activeRoundViews,
    betslipLink: activeRound?.betslipLink ?? null,
    betslipLinks: activeRound?.betslipLinks ?? null,
    isOwner: membership.role === "owner",
    recentRounds: recentSettled.map(mapHistoryRound),
  });
}

/**
 * Owner updates group settings.
 * Leg quota changes apply to every eligible open bet; locked/in-progress bets
 * keep their snapshot. The active-bet cap cannot be lowered below current use.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateGroupSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateResult = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`
    );

    const membership = await tx.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: id, userId: session!.user!.id },
      },
      include: {
        group: {
          include: { members: { select: { userId: true } } },
        },
      },
    });
    if (!membership || membership.role !== "owner") {
      return { error: "Only the group owner can change settings", status: 403 };
    }

    const activeRounds = await tx.round.findMany({
      where: { groupId: id, status: { in: ["open", "locked"] } },
      include: {
        legs: { select: { userId: true, kickoff: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const nextQuota =
      parsed.data.legsPerMember ?? membership.group.legsPerMember;
    const nextMax =
      parsed.data.maxActiveBets ?? membership.group.maxActiveBets;

    if (nextMax < activeRounds.length) {
      return {
        error: `Can't lower the limit to ${nextMax} while ${activeRounds.length} bets are still open or locked`,
        status: 409,
      };
    }

    const applicableOpenRounds = activeRounds.filter(
      (round) =>
        round.status === "open" && !isPastKickoffCutoff(round.legs)
    );
    if (parsed.data.legsPerMember !== undefined) {
      for (const round of applicableOpenRounds) {
        const counts = countLegsByUser(round.legs);
        if ([...counts.values()].some((count) => count > nextQuota)) {
          return {
            error: `Can't lower to ${nextQuota}. At least one member already has more than ${nextQuota} leg${nextQuota === 1 ? "" : "s"} on Bet #${round.betNumber ?? "?"}.`,
            status: 409,
          };
        }
      }
    }

    const group = await tx.group.update({
      where: { id },
      data: {
        ...(parsed.data.legsPerMember !== undefined
          ? { legsPerMember: nextQuota }
          : {}),
        ...(parsed.data.maxActiveBets !== undefined
          ? { maxActiveBets: nextMax }
          : {}),
      },
      select: {
        id: true,
        name: true,
        legsPerMember: true,
        maxActiveBets: true,
      },
    });

    if (
      parsed.data.legsPerMember !== undefined &&
      applicableOpenRounds.length > 0
    ) {
      await tx.round.updateMany({
        where: { id: { in: applicableOpenRounds.map((round) => round.id) } },
        data: { legsPerMember: nextQuota },
      });
    }

    return {
      group,
      applicableOpenRounds,
      memberUserIds: membership.group.members.map((member) => member.userId),
    };
  });

  if ("error" in updateResult) {
    return NextResponse.json(
      { error: updateResult.error },
      { status: updateResult.status }
    );
  }

  let lockedAfterChange = 0;
  if (parsed.data.legsPerMember !== undefined) {
    for (const round of updateResult.applicableOpenRounds) {
      if (
        round.legs.length > 0 &&
        allMembersFilledQuota({
          memberUserIds: updateResult.memberUserIds,
          legs: round.legs,
          legsPerMember: updateResult.group.legsPerMember,
        })
      ) {
        try {
          await claimAndLockRound(round.id);
          lockedAfterChange++;
        } catch (error) {
          console.error(
            "[groups] lock after legsPerMember change failed",
            round.id,
            error
          );
        }
      }
    }
  }

  const notes = ["Saved."];
  if (parsed.data.maxActiveBets !== undefined) {
    notes.push(
      `Up to ${updateResult.group.maxActiveBets} active bet${
        updateResult.group.maxActiveBets === 1 ? "" : "s"
      } allowed.`
    );
  }
  if (parsed.data.legsPerMember !== undefined) {
    notes.push(
      updateResult.applicableOpenRounds.length > 0
        ? `Updated ${updateResult.applicableOpenRounds.length} open bet${
            updateResult.applicableOpenRounds.length === 1 ? "" : "s"
          } to ${updateResult.group.legsPerMember} leg${
            updateResult.group.legsPerMember === 1 ? "" : "s"
          } per member.`
        : "The new leg quota will apply to the next open bet."
    );
  }
  if (lockedAfterChange > 0) {
    notes.push(
      `${lockedAfterChange} bet${lockedAfterChange === 1 ? "" : "s"} ${
        lockedAfterChange === 1 ? "is" : "are"
      } now locking because everyone already filled the new quota.`
    );
  }

  return NextResponse.json({
    group: updateResult.group,
    appliedToOpenRound: updateResult.applicableOpenRounds.length > 0,
    note: notes.join(" "),
  });
}

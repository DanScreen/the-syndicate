import { requireSession } from "@/lib/api-auth";
import { mapHistoryRound } from "@/lib/groups/map-history-round";
import { buildRoundBetslipLinks } from "@/lib/odds/betslip-links";
import {
  computeAccaRankingsForLegs,
  mergeLegBookmakerLinks,
} from "@/lib/odds/lock-round";
import { claimAndLockRound } from "@/lib/rounds/claim-lock-round";
import { isPastKickoffCutoff } from "@/lib/rounds/first-kickoff";
import { lockOpenRoundsAtKickoff } from "@/lib/rounds/lock-open-rounds-at-kickoff";
import { openRound } from "@/lib/rounds/open-round";
import { memberNetPointsAcrossRounds } from "@/lib/stats/helpers";
import { prisma } from "@tiki-acca/database";
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
    let refreshed = await prisma.round.findUnique({
      where: { id: activeRound.id },
      include: recentRoundInclude,
    });
    if (refreshed) activeRound = refreshed;

    // Final-submit lock can fail if live odds vanished (fixture kicked off /
    // feed gap). Retry here so the round doesn't sit on "locking…" forever.
    if (
      activeRound.status === "open" &&
      allMembersFilledQuota({
        memberUserIds: group.members.map((m) => m.userId),
        legs: activeRound.legs,
        legsPerMember: activeRound.legsPerMember,
      })
    ) {
      try {
        await claimAndLockRound(activeRound.id);
      } catch (err) {
        console.error("[groups] retry lock on load failed", activeRound.id, err);
      }
      refreshed = await prisma.round.findUnique({
        where: { id: activeRound.id },
        include: recentRoundInclude,
      });
      if (refreshed) activeRound = refreshed;
    }
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

/**
 * Owner updates group settings.
 * When the active round is still open (not locked / not past kickoff), the new
 * quota applies to that open bet immediately. Locked and in-progress rounds are
 * left alone — the group setting then applies to the next open round.
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

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: id, userId: session!.user!.id },
    },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only the group owner can change settings" },
      { status: 403 }
    );
  }

  const nextQuota = parsed.data.legsPerMember;

  const activeRound = await prisma.round.findFirst({
    where: { groupId: id, status: { in: ["open", "locked"] } },
    include: {
      legs: { select: { userId: true, kickoff: true } },
      group: { include: { members: { select: { userId: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  let appliedToOpenRound = false;
  let note =
    "Saved. Legs per member will apply to the next open round.";

  if (activeRound?.status === "open") {
    if (isPastKickoffCutoff(activeRound.legs)) {
      note =
        "Saved for the next round. The current open bet is already in progress (first kickoff), so its quota stays unchanged.";
    } else {
      const counts = countLegsByUser(activeRound.legs);
      const overQuota = [...counts.entries()].filter(
        ([, count]) => count > nextQuota
      );
      if (overQuota.length > 0) {
        return NextResponse.json(
          {
            error: `Can't lower to ${nextQuota} — at least one member already has more than ${nextQuota} leg${nextQuota === 1 ? "" : "s"} on this open round.`,
          },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.group.update({
          where: { id },
          data: { legsPerMember: nextQuota },
        }),
        prisma.round.update({
          where: { id: activeRound.id },
          data: { legsPerMember: nextQuota },
        }),
      ]);
      appliedToOpenRound = true;
      note =
        nextQuota === activeRound.legsPerMember
          ? "Saved."
          : `Saved. This open round is now ${nextQuota} leg${nextQuota === 1 ? "" : "s"} per member.`;

      const memberUserIds = activeRound.group.members.map((m) => m.userId);
      const shouldLock = allMembersFilledQuota({
        memberUserIds,
        legs: activeRound.legs,
        legsPerMember: nextQuota,
      });
      if (shouldLock && activeRound.legs.length > 0) {
        try {
          await claimAndLockRound(activeRound.id);
          note =
            "Saved. Everyone was already at the new quota — the acca is locking.";
        } catch (err) {
          console.error(
            "[groups] lock after legsPerMember change failed",
            activeRound.id,
            err
          );
        }
      }

      const group = await prisma.group.findUniqueOrThrow({
        where: { id },
        select: { id: true, name: true, legsPerMember: true },
      });

      return NextResponse.json({
        group,
        appliedToOpenRound,
        note,
      });
    }
  } else if (activeRound?.status === "locked") {
    note =
      "Saved for the next round. The current bet is locked, so its quota stays unchanged.";
  }

  const group = await prisma.group.update({
    where: { id },
    data: { legsPerMember: nextQuota },
    select: {
      id: true,
      name: true,
      legsPerMember: true,
    },
  });

  return NextResponse.json({
    group,
    appliedToOpenRound,
    note,
  });
}

import { prisma } from "@tiki-acca/database";
import {
  groupNetPoints,
  statsRoundWhere,
  type RoundWithLegs,
} from "@/lib/stats/helpers";

export type GroupLeaderboardEntry = {
  rank: number;
  groupId: string;
  name: string;
  ownerName: string;
  memberCount: number;
  totalPoints: number;
  legsWon: number;
  legsLost: number;
};

export type PlayerLeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  legsWon: number;
  legsLost: number;
  groupCount: number;
};

export type PlatformLeaderboards = {
  groups: GroupLeaderboardEntry[];
  players: PlayerLeaderboardEntry[];
};

export type GroupLeaderboardSource = {
  id: string;
  name: string;
  ownerName: string;
  members: Array<{ legsWon: number; legsLost: number }>;
  rounds: RoundWithLegs[];
};

/**
 * Rank groups by group acca points (`groupNetPoints`) — the same metric as
 * group Performance / dashboard "Group points". Do not sum member leg points:
 * on a win, member totals do not equal the group total; on a loss the group
 * is −1 while winning members can still be positive.
 */
export function rankGroupsByAccaPoints(
  groups: GroupLeaderboardSource[]
): GroupLeaderboardEntry[] {
  const rows = groups
    .map((g) => ({
      groupId: g.id,
      name: g.name,
      ownerName: g.ownerName,
      memberCount: g.members.length,
      totalPoints: groupNetPoints(g.rounds),
      legsWon: g.members.reduce((sum, m) => sum + m.legsWon, 0),
      legsLost: g.members.reduce((sum, m) => sum + m.legsLost, 0),
    }))
    .filter((g) => g.memberCount > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));

  return rows.map((row, i) => ({
    rank: i + 1,
    ...row,
  }));
}

export async function computePlatformLeaderboards(): Promise<PlatformLeaderboards> {
  const [groupRecords, users] = await Promise.all([
    prisma.group.findMany({
      select: {
        id: true,
        name: true,
        owner: { select: { name: true } },
        members: {
          select: { legsWon: true, legsLost: true },
        },
        rounds: {
          where: statsRoundWhere,
          include: { legs: true },
        },
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        totalPoints: true,
        legsWon: true,
        legsLost: true,
        _count: { select: { memberships: true } },
      },
      orderBy: { totalPoints: "desc" },
    }),
  ]);

  const groups = rankGroupsByAccaPoints(
    groupRecords.map((g) => ({
      id: g.id,
      name: g.name,
      ownerName: g.owner.name,
      members: g.members,
      rounds: g.rounds,
    }))
  );

  const players: PlayerLeaderboardEntry[] = users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    name: u.name,
    totalPoints: u.totalPoints,
    legsWon: u.legsWon,
    legsLost: u.legsLost,
    groupCount: u._count.memberships,
  }));

  return { groups, players };
}

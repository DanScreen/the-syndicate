import { prisma } from "@tiki-acca/database";

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

export async function computePlatformLeaderboards(): Promise<PlatformLeaderboards> {
  const [groupRecords, users] = await Promise.all([
    prisma.group.findMany({
      select: {
        id: true,
        name: true,
        owner: { select: { name: true } },
        members: {
          select: { points: true, legsWon: true, legsLost: true },
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

  const groupRows = groupRecords
    .map((g) => ({
      groupId: g.id,
      name: g.name,
      ownerName: g.owner.name,
      memberCount: g.members.length,
      totalPoints: g.members.reduce((sum, m) => sum + m.points, 0),
      legsWon: g.members.reduce((sum, m) => sum + m.legsWon, 0),
      legsLost: g.members.reduce((sum, m) => sum + m.legsLost, 0),
    }))
    .filter((g) => g.memberCount > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const groups: GroupLeaderboardEntry[] = groupRows.map((row, i) => ({
    rank: i + 1,
    ...row,
  }));

  const players: PlayerLeaderboardEntry[] = users
    .filter((u) => u._count.memberships > 0 || u.totalPoints !== 0)
    .map((u, i) => ({
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

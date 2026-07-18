import { AppHeader } from "@/components/header";
import { PageView } from "@/components/analytics/page-view";
import { ActiveBetslipSummary } from "@/components/active-betslip-summary";
import { PointsText } from "@/components/points-text";
import { yourLegStatusMessage } from "@tiki-acca/shared";
import { activeLegsInRound, yourLegInRound } from "@/lib/groups/your-leg-summary";
import { openRound } from "@/lib/rounds/open-round";
import { groupNetPoints, memberNetPointsAcrossRounds } from "@/lib/stats/helpers";
import { formatLegPoints, formatRoundStatusBadge } from "@tiki-acca/shared";
import { auth } from "@/lib/auth";
import { greetingFirstName } from "@/lib/user-display";
import { prisma } from "@tiki-acca/database";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, name: true },
  });

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { members: true } },
          rounds: {
            include: {
              legs: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const isNewUser = memberships.length === 0;

  // Your live points tally across all groups (same rule as each group card and
  // Performance). User.totalPoints is denormalized and can be stale, so sum the
  // recomputed per-group member points instead.
  const yourTotalPoints = Number(
    memberships
      .reduce(
        (sum, m) =>
          sum + memberNetPointsAcrossRounds(m.group.rounds, session.user.id),
        0
      )
      .toFixed(2)
  );

  // One query for unread counts across all groups (was one COUNT per group card).
  const unreadSinceByGroup = new Map(
    memberships.map((m) => [
      m.group.id,
      m.lastReadMessageAt && m.lastReadMessageAt > m.joinedAt
        ? m.lastReadMessageAt
        : m.joinedAt,
    ])
  );
  const unreadCountByGroup = new Map<string, number>();
  if (memberships.length > 0) {
    const unreadMessages = await prisma.roundMessage.findMany({
      where: {
        OR: memberships.map((m) => ({
          round: { groupId: m.group.id },
          createdAt: { gt: unreadSinceByGroup.get(m.group.id)! },
          OR: [{ userId: null }, { userId: { not: session.user.id } }],
        })),
      },
      select: { round: { select: { groupId: true } } },
    });
    for (const msg of unreadMessages) {
      const gid = msg.round.groupId;
      unreadCountByGroup.set(gid, (unreadCountByGroup.get(gid) ?? 0) + 1);
    }
  }

  return (
    <div className="min-h-screen">
      <PageView path="/dashboard" userId={session.user.id} />
      <AppHeader userName={greetingFirstName(user ?? {})} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Your Groups</h1>
            <p className="mt-1 text-sm text-muted">
              {memberships.length} group{memberships.length === 1 ? "" : "s"} ·{" "}
              {formatLegPoints(yourTotalPoints)} pts total ·{" "}
              <Link href="/performance" className="text-accent hover:underline">
                View performance
              </Link>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/groups/join"
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card"
            >
              Join group
            </Link>
            <Link
              href="/groups/create"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-bright"
            >
              Create group
            </Link>
          </div>
        </div>

        {isNewUser && (
          <section className="mt-8 rounded-xl border border-accent/30 bg-accent-muted/20 p-6">
            <h2 className="font-semibold text-accent">Welcome To Tiki Acca</h2>
            <p className="mt-2 text-sm text-muted">
              Get your mates together in three steps:
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Create a group and share the invite link</li>
              <li>Each member picks their legs in the open round</li>
              <li>When everyone&apos;s in, the acca locks and you get the best combined odds</li>
            </ol>
            <Link
              href="/groups/create"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-bright"
            >
              Create your first group
            </Link>
          </section>
        )}

        <section className="mt-8">
          {/* New users get the welcome panel above — no second empty state. */}
          {memberships.length === 0 ? null : (
            <div className="grid gap-4 md:grid-cols-2">
              {(await Promise.all(
                memberships.map(async (m) => {
                  const allRounds = m.group.rounds;
                  const activeRoundRow =
                    allRounds.find((r) => r.status !== "settled") ?? null;
                  let activeRound: {
                    id: string;
                    status: string;
                    combinedOdds: number | null;
                    legsPerMember: number;
                  } | null = activeRoundRow
                    ? {
                        id: activeRoundRow.id,
                        status: activeRoundRow.status,
                        combinedOdds: activeRoundRow.combinedOdds,
                        legsPerMember: activeRoundRow.legsPerMember,
                      }
                    : null;
                  if (!activeRound) {
                    const opened = await openRound(m.group.id);
                    activeRound = {
                      id: opened.id,
                      status: opened.status,
                      combinedOdds: opened.combinedOdds,
                      legsPerMember: opened.legsPerMember,
                    };
                  }
                  const legs = activeRoundRow?.legs ?? [];
                  const groupPoints = groupNetPoints(allRounds);
                  // Live member points (same rule as leaderboard / Performance).
                  // GroupMember.points is denormalized and can be stale after
                  // scoring-rule changes, so never render it directly.
                  const yourPoints = memberNetPointsAcrossRounds(
                    allRounds,
                    session.user.id
                  );
                  const yourLeg = yourLegInRound(legs, session.user.id);
                  const yourLegCount = legs.filter(
                    (l) => l.userId === session.user.id
                  ).length;
                  const activeLegs = activeLegsInRound(legs, session.user.id);
                  const unreadMessageCount =
                    unreadCountByGroup.get(m.group.id) ?? 0;
                  const roundStatus = activeRound?.status ?? "open";
                  const legsPerMember =
                    activeRound?.legsPerMember ?? m.group.legsPerMember ?? 1;
                  return {
                    membership: m,
                    activeRound,
                    groupPoints,
                    yourPoints,
                    yourLeg,
                    yourLegCount,
                    legsPerMember,
                    activeLegs,
                    roundStatus,
                    unreadMessageCount,
                  };
                })
              )).map(
                ({
                  membership: m,
                  activeRound,
                  groupPoints,
                  yourPoints,
                  yourLeg,
                  yourLegCount,
                  legsPerMember,
                  activeLegs,
                  roundStatus,
                  unreadMessageCount,
                }) => (
                  <Link
                    key={m.group.id}
                    href={`/groups/${m.group.id}`}
                    className="rounded-xl border border-border bg-card p-5 hover:border-accent/50"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{m.group.name}</h3>
                      <div className="flex items-center gap-2">
                        {unreadMessageCount > 0 ? (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
                            {unreadMessageCount} new
                          </span>
                        ) : null}
                        <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
                          {formatRoundStatusBadge(activeRound?.status ?? "open")}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {m.group._count.members} members · Owner: {m.group.owner.name}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <PointsText points={groupPoints} label="Group points" />
                      <PointsText points={yourPoints} label="Your points" />
                    </div>
                    <ActiveBetslipSummary
                      legs={activeLegs}
                      currentUserId={session.user.id}
                      combinedOdds={activeRound?.combinedOdds}
                      waitingMessage={
                        yourLegStatusMessage(roundStatus, yourLeg, {
                          yourLegCount,
                          legsPerMember,
                        }) || undefined
                      }
                    />
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

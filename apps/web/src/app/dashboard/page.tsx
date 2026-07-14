import { AppHeader } from "@/components/header";
import { PageView } from "@/components/analytics/page-view";
import { ActiveBetslipSummary } from "@/components/active-betslip-summary";
import { PointsText } from "@/components/points-text";
import { yourLegStatusMessage } from "@the-syndicate/shared";
import { activeLegsInRound, yourLegInRound } from "@/lib/groups/your-leg-summary";
import { openRound } from "@/lib/rounds/open-round";
import { groupNetPoints } from "@/lib/stats/helpers";
import { formatLegPoints, formatRoundStatusBadge } from "@the-syndicate/shared";
import { auth } from "@/lib/auth";
import { greetingFirstName } from "@/lib/user-display";
import { prisma } from "@the-syndicate/database";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, name: true, totalPoints: true },
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

  return (
    <div className="min-h-screen">
      <PageView path="/dashboard" userId={session.user.id} />
      <AppHeader userName={greetingFirstName(user ?? {})} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Your groups</h1>
            <p className="mt-1 text-sm text-muted">
              {memberships.length} group{memberships.length === 1 ? "" : "s"} ·{" "}
              {formatLegPoints(user?.totalPoints ?? 0)} pts total ·{" "}
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-green-400"
            >
              Create group
            </Link>
          </div>
        </div>

        {isNewUser && (
          <section className="mt-8 rounded-xl border border-accent/30 bg-accent-muted/20 p-6">
            <h2 className="font-semibold text-accent">Welcome to The Syndicate</h2>
            <p className="mt-2 text-sm text-muted">
              Get your mates together in three steps:
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Create a group and share the invite link</li>
              <li>Each member picks one leg in the open round</li>
              <li>When everyone&apos;s in, the acca locks and you get the best combined odds</li>
            </ol>
            <Link
              href="/groups/create"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-green-400"
            >
              Create your first syndicate
            </Link>
          </section>
        )}

        <section className="mt-8">
          {memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
              <p>No groups yet.</p>
              <p className="mt-2 text-sm">
                Create a syndicate for your mates or join with an invite code.
              </p>
            </div>
          ) : (
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
                  } | null = activeRoundRow;
                  if (!activeRound) {
                    activeRound = await openRound(m.group.id);
                  }
                  const legs = activeRoundRow?.legs ?? [];
                  const syndicatePoints = groupNetPoints(allRounds);
                  const yourLeg = yourLegInRound(legs, session.user.id);
                  const activeLegs = activeLegsInRound(legs, session.user.id);
                  const roundStatus = activeRound?.status ?? "open";
                  return {
                    membership: m,
                    activeRound,
                    syndicatePoints,
                    yourLeg,
                    activeLegs,
                    roundStatus,
                  };
                })
              )).map(
                ({
                  membership: m,
                  activeRound,
                  syndicatePoints,
                  yourLeg,
                  activeLegs,
                  roundStatus,
                }) => (
                  <Link
                    key={m.group.id}
                    href={`/groups/${m.group.id}`}
                    className="rounded-xl border border-border bg-card p-5 hover:border-accent/50"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{m.group.name}</h3>
                      <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
                        {formatRoundStatusBadge(activeRound?.status ?? "open")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {m.group._count.members} members · Owner: {m.group.owner.name}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <PointsText points={syndicatePoints} label="Group points" />
                      <PointsText points={m.points} label="Your points" />
                    </div>
                    <ActiveBetslipSummary
                      legs={activeLegs}
                      currentUserId={session.user.id}
                      combinedOdds={activeRound?.combinedOdds}
                      waitingMessage={
                        yourLegStatusMessage(roundStatus, yourLeg) || undefined
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

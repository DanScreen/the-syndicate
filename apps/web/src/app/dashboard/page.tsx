import { AppHeader } from "@/components/layout/header";
import {
  ActiveBetslipSummary,
  ActiveBetsSummary,
} from "@/components/active-betslip-summary";
import { PointsText } from "@/components/points-text";
import { listGroupSummaries } from "@/lib/groups/list-group-summaries";
import {
  formatLegPoints,
  formatRoundStatusBadge,
  yourLegStatusMessage,
} from "@tiki-acca/shared";
import { auth } from "@/lib/auth";
import { greetingFirstName } from "@/lib/user-display";
import { prisma } from "@tiki-acca/database";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const [user, groups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, name: true },
    }),
    listGroupSummaries(session.user.id),
  ]);

  const isNewUser = groups.length === 0;

  // Your live points tally across all groups (same rule as each group card and
  // Performance).
  const yourTotalPoints = Number(
    groups.reduce((sum, g) => sum + g.points, 0).toFixed(2)
  );

  return (
    <div className="min-h-screen">
      <AppHeader userName={greetingFirstName(user ?? {})} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Your Groups</h1>
            <p className="mt-1 text-sm text-muted">
              {groups.length} group{groups.length === 1 ? "" : "s"} ·{" "}
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
          {groups.length === 0 ? null : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-accent/50"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{g.name}</h3>
                    <div className="flex items-center gap-2">
                      {g.unreadMessageCount > 0 ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
                          {g.unreadMessageCount} new
                        </span>
                      ) : null}
                      <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
                        {g.activeBetCount > 1
                          ? `${g.activeBetCount} Active`
                          : formatRoundStatusBadge(g.status)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {g.memberCount} members · Owner: {g.ownerName}
                    {g.activeBetCount > 1 ? ` · ${g.activeBetCount} active bets` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <PointsText points={g.groupPoints} label="Group points" />
                    <PointsText points={g.points} label="Your points" />
                  </div>
                  {g.activeBetCount > 1 ? (
                    <ActiveBetsSummary bets={g.activeBets} />
                  ) : (
                    <ActiveBetslipSummary
                      legs={g.activeLegs}
                      currentUserId={session.user.id}
                      combinedOdds={g.activeRound?.combinedOdds}
                      waitingMessage={
                        yourLegStatusMessage(g.status, g.yourLeg, {
                          yourLegCount: g.yourLegCount,
                          legsPerMember:
                            g.activeRound?.legsPerMember ?? g.legsPerMember ?? 1,
                        }) || undefined
                      }
                    />
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

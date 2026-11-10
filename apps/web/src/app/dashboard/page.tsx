import { AppHeader } from "@/components/layout/header";
import {
  ActiveBetslipSummary,
  ActiveBetsSummary,
} from "@/components/active-betslip-summary";
import { PointsText } from "@/components/points-text";
import { listGroupSummaries } from "@/lib/groups/list-group-summaries";
import {
  activeBetProgressLabel,
  copy,
  deriveHomeCardState,
  formatKickoff,
  formatLegPoints,
  formatRoundStatusBadge,
  yourLegStatusMessage,
  type GroupSummary,
  type GroupSummaryActiveBet,
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
            <h2 className="font-semibold text-accent">{copy.dashboard.welcomeTitle}</h2>
            <p className="mt-2 text-sm text-muted">{copy.dashboard.welcomeIntro}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              {copy.dashboard.welcomeSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link
              href="/groups/create"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-bright"
            >
              {copy.dashboard.welcomeCta}
            </Link>
          </section>
        )}

        <section className="mt-8">
          {/* New users get the welcome panel above — no second empty state. */}
          {groups.length === 0 ? null : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((g) => (
                <GroupCard key={g.id} group={g} currentUserId={session.user.id} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function GroupCard({
  group,
  currentUserId,
}: {
  group: GroupSummary;
  currentUserId: string;
}) {
  const { state, bet } = deriveHomeCardState(group);
  const round = group.activeRound;
  const legs = group.activeLegs;
  const multi = group.activeBetCount > 1;
  const needsPick = state === "needs-pick";
  // Nobody has picked yet: keep the card calm (no accent border, no "needed" line).
  const quietPick = needsPick && legs.length === 0;
  const odds = bet?.combinedOdds ?? round?.combinedOdds ?? null;

  const waitingMessage =
    yourLegStatusMessage(group.status, group.yourLeg, {
      yourLegCount: group.yourLegCount,
      legsPerMember: round?.legsPerMember ?? group.legsPerMember ?? 1,
      unlimitedLegs: bet?.unlimitedLegs ?? false,
      roundLegCount: legs.length,
    }) || undefined;
  // Pick prompt replaces the waiting text while you still owe a leg, unless
  // there is no betslip yet (then the text explains why nothing is locked).
  const showWaitingMessage = state === "fallback" || (needsPick && legs.length === 0);

  return (
    <Link
      href={`/groups/${group.id}`}
      className={`rounded-xl border bg-card p-5 ${
        needsPick && !quietPick ? "border-accent" : "border-border hover:border-accent/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{group.name}</h3>
        <div className="flex items-center gap-2">
          {group.unreadMessageCount > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">
              {group.unreadMessageCount} new
            </span>
          ) : null}
          <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
            {multi ? `${group.activeBetCount} Active` : formatRoundStatusBadge(group.status)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {group.memberCount} members · Owner: {group.ownerName}
        {multi ? ` · ${group.activeBetCount} active bets` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <PointsText points={group.groupPoints} label="Group points" />
        <PointsText points={group.points} label="Your points" />
      </div>

      {multi ? (
        <>
          <ActiveBetsSummary bets={group.activeBets ?? []} />
          {needsPick ? <PickPrompt bet={bet} quiet={quietPick} /> : null}
        </>
      ) : (
        <>
          {state === "waiting" && bet ? (
            <p className="mt-3 text-sm text-muted">
              {bet.unlimitedLegs
                ? activeBetProgressLabel(bet)
                : `${bet.submittedLegCount} of ${bet.requiredLegCount} legs in`}
            </p>
          ) : null}
          {state === "betslip" && bet ? (
            <p className="mt-3 text-sm text-muted">
              {bet.resolvedLegCount} of {bet.submittedLegCount} legs settled
            </p>
          ) : null}
          <ActiveBetslipSummary
            legs={legs}
            currentUserId={currentUserId}
            combinedOdds={odds}
            prominentOdds={state === "betslip"}
            waitingMessage={showWaitingMessage ? waitingMessage : undefined}
          />
          {needsPick ? <PickPrompt bet={bet} quiet={quietPick} /> : null}
        </>
      )}
    </Link>
  );
}

/**
 * Call to action inside the card link (the whole card already goes to the group),
 * so it is a styled span rather than a nested link.
 */
function PickPrompt({
  bet,
  quiet = false,
}: {
  bet: GroupSummaryActiveBet | null;
  /** No legs in yet: just the button and lock time, no "needed" line. */
  quiet?: boolean;
}) {
  const lock = bet?.firstKickoff ? formatKickoff(bet.firstKickoff) : null;
  return (
    <div className="mt-3 border-t border-border pt-3">
      {quiet ? null : <p className="font-medium text-accent">Your pick is needed</p>}
      {lock ? <p className="mt-1 text-sm text-muted">Locks {lock}</p> : null}
      <span className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-bright">
        Pick your leg
      </span>
    </div>
  );
}

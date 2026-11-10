import {
  activeBetProgressLabel,
  activeBetStatusLabel,
  formatOdds,
} from "@tiki-acca/shared";
import {
  legOutcomeShortLabel,
  type GroupSummaryActiveBet,
  type GroupSummaryActiveLeg,
} from "@tiki-acca/shared";
import { Avatar } from "@/components/avatar";

const MAX_VISIBLE_ACTIVE_BETS = 3;

export function ActiveBetsSummary({
  bets,
}: {
  bets: GroupSummaryActiveBet[];
}) {
  const visible = bets.slice(0, MAX_VISIBLE_ACTIVE_BETS);
  const hiddenCount = bets.length - visible.length;

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Active bets · {bets.length}
      </p>
      <ul className="mt-1 divide-y divide-border">
        {visible.map((bet) => {
          const needsPick =
            bet.status === "open" && bet.yourLegCount < bet.legsPerMember;
          return (
            <li
              key={bet.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="font-semibold text-foreground">
                  Bet #{bet.betNumber ?? "?"}
                </span>
                <span className="ml-2 text-xs text-muted">
                  {activeBetStatusLabel(bet)}
                </span>
                <span
                  className={`block truncate text-xs ${
                    needsPick ? "font-medium text-warning" : "text-muted"
                  }`}
                >
                  {activeBetProgressLabel(bet)}
                </span>
              </span>
              {bet.combinedOdds != null ? (
                <span className="shrink-0 text-xs font-medium text-foreground">
                  @ {formatOdds(bet.combinedOdds)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <p className="border-t border-border pt-2 text-xs font-medium text-accent">
          +{hiddenCount} more
        </p>
      ) : null}
    </div>
  );
}

export function ActiveBetslipSummary({
  legs,
  currentUserId,
  combinedOdds,
  prominentOdds = false,
  waitingMessage,
}: {
  legs: GroupSummaryActiveLeg[];
  currentUserId: string;
  combinedOdds?: number | null;
  /** Locked rounds show the acca odds large under the header instead of in it. */
  prominentOdds?: boolean;
  waitingMessage?: string;
}) {
  if (legs.length === 0) {
    if (!waitingMessage) return null;
    // No legs in yet: a quiet prompt, not a warning.
    return <p className="mt-3 text-sm text-muted">{waitingMessage}</p>;
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Current betslip · {legs.length} leg{legs.length === 1 ? "" : "s"}
        </p>
        {combinedOdds != null && !prominentOdds ? (
          <p className="text-xs text-muted">
            Acca @ <span className="font-medium text-foreground">{formatOdds(combinedOdds)}</span>
          </p>
        ) : null}
      </div>
      {combinedOdds != null && prominentOdds ? (
        <div className="mt-2">
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {formatOdds(combinedOdds)}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted">Acca odds</p>
        </div>
      ) : null}
      <ul className="mt-2 space-y-2">
        {legs.map((leg) => {
          const isYours = leg.userId === currentUserId;
          const outcome = legOutcomeShortLabel(leg.outcome);
          return (
            <li
              key={`${leg.userId}-${leg.selectionLabel}-${leg.odds}`}
              className="flex items-center gap-2 text-sm"
            >
              <Avatar name={leg.userName} userId={leg.userId} size="xs" label={leg.userName} />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate font-semibold text-foreground">
                    {leg.selectionLabel}
                  </span>
                  {isYours ? (
                    <span className="shrink-0 text-xs font-medium text-accent">You</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted">
                  {leg.homeTeam} vs {leg.awayTeam}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {formatOdds(leg.odds)}
              </span>
              {leg.outcome === "won" ? (
                <span role="img" aria-label={outcome} className="w-4 shrink-0 text-center font-bold text-success">
                  ✓
                </span>
              ) : leg.outcome === "lost" ? (
                <span role="img" aria-label={outcome} className="w-4 shrink-0 text-center font-bold text-danger">
                  ✕
                </span>
              ) : leg.outcome === "void" ? (
                <span aria-label={outcome} className="shrink-0 text-xs font-medium text-muted">
                  Void
                </span>
              ) : (
                <span aria-hidden className="w-4 shrink-0" />
              )}
            </li>
          );
        })}
      </ul>
      {waitingMessage ? (
        <p className="mt-2 text-sm text-warning">{waitingMessage}</p>
      ) : null}
    </div>
  );
}

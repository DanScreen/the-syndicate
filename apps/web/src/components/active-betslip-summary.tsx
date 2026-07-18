import {
  activeBetProgressLabel,
  activeBetStatusLabel,
  formatOdds,
} from "@tiki-acca/shared";
import {
  formatActiveLegSummary,
  legOutcomeShortLabel,
  type GroupSummaryActiveBet,
  type GroupSummaryActiveLeg,
} from "@tiki-acca/shared";

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
  waitingMessage,
}: {
  legs: GroupSummaryActiveLeg[];
  currentUserId: string;
  combinedOdds?: number | null;
  waitingMessage?: string;
}) {
  if (legs.length === 0) {
    if (!waitingMessage) return null;
    return (
      <p className="mt-3 text-sm text-warning">{waitingMessage}</p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Current betslip · {legs.length} leg{legs.length === 1 ? "" : "s"}
        </p>
        {combinedOdds != null ? (
          <p className="text-xs text-muted">
            Acca @ <span className="font-medium text-foreground">{formatOdds(combinedOdds)}</span>
          </p>
        ) : null}
      </div>
      <ul className="mt-2 space-y-2">
        {legs.map((leg) => {
          const isYours = leg.userId === currentUserId;
          const outcome = legOutcomeShortLabel(leg.outcome);
          return (
            <li key={`${leg.userId}-${leg.selectionLabel}-${leg.odds}`} className="text-sm">
              <p className="font-medium text-foreground">
                {isYours ? (
                  <span className="text-accent">You</span>
                ) : (
                  leg.userName
                )}
                {outcome ? (
                  <span
                    className={`ml-2 text-xs font-medium ${
                      leg.outcome === "won"
                        ? "text-success"
                        : leg.outcome === "lost"
                          ? "text-danger"
                          : "text-muted"
                    }`}
                  >
                    {outcome}
                  </span>
                ) : null}
              </p>
              <p className="text-muted">{formatActiveLegSummary(leg)}</p>
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

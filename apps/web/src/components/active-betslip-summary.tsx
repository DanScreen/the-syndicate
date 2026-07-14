import {
  formatActiveLegSummary,
  legOutcomeShortLabel,
  type GroupSummaryActiveLeg,
} from "@the-syndicate/shared";

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
      <p className="mt-3 text-sm text-amber-400">{waitingMessage}</p>
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
            Acca @ <span className="font-medium text-foreground">{combinedOdds}</span>
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
                        ? "text-green-400"
                        : leg.outcome === "lost"
                          ? "text-red-400"
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
        <p className="mt-2 text-sm text-amber-400">{waitingMessage}</p>
      ) : null}
    </div>
  );
}

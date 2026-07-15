import type { GroupSummaryActiveLeg, GroupSummaryYourLeg } from "./api-types";
import type { RoundStatus } from "./types";

export function yourLegStatusMessage(
  roundStatus: RoundStatus | string,
  yourLeg: GroupSummaryYourLeg | null,
  options?: { yourLegCount?: number; legsPerMember?: number }
): string {
  const quota = options?.legsPerMember ?? 1;
  const count = options?.yourLegCount ?? (yourLeg ? 1 : 0);

  if (count >= quota) return "";

  if (roundStatus === "open") {
    if (count === 0) {
      return quota === 1
        ? "Waiting for your pick — group can't lock until you submit"
        : `Waiting for your picks — ${quota} legs each this round`;
    }
    return `You've submitted ${count} of ${quota} legs — finish your quota to lock`;
  }

  if (roundStatus === "locked") {
    return count === 0
      ? "You didn't submit before kickoff — not in this acca"
      : `You only submitted ${count} of ${quota} before kickoff`;
  }

  return "";
}

export function formatYourLegSummary(leg: GroupSummaryYourLeg): string {
  return `${leg.homeTeam} vs ${leg.awayTeam} · ${leg.marketLabel}: ${leg.selectionLabel} @ ${leg.odds.toFixed(2)}`;
}

export function formatActiveLegSummary(leg: GroupSummaryActiveLeg): string {
  return `${leg.homeTeam} vs ${leg.awayTeam} · ${leg.marketLabel}: ${leg.selectionLabel} @ ${leg.odds.toFixed(2)}`;
}

export function legOutcomeShortLabel(outcome: string): string {
  if (outcome === "won") return "Won";
  if (outcome === "lost") return "Lost";
  if (outcome === "void") return "Void";
  return "";
}

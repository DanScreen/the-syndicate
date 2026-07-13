import type { GroupSummaryYourLeg } from "./api-types";
import type { RoundStatus } from "./types";

export function yourLegStatusMessage(
  roundStatus: RoundStatus | string,
  yourLeg: GroupSummaryYourLeg | null
): string {
  if (yourLeg) return "";

  if (roundStatus === "open") {
    return "Waiting for your pick — syndicate can't lock until you submit";
  }

  if (roundStatus === "locked") {
    return "You didn't submit before kickoff — not in this acca";
  }

  return "";
}

export function formatYourLegSummary(leg: GroupSummaryYourLeg): string {
  return `${leg.homeTeam} vs ${leg.awayTeam} · ${leg.marketLabel}: ${leg.selectionLabel} @ ${leg.odds.toFixed(2)}`;
}

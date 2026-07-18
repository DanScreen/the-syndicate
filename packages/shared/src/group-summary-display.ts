import type {
  GroupSummaryActiveBet,
  GroupSummaryActiveLeg,
  GroupSummaryYourLeg,
} from "./api-types";
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

export function activeBetStatusLabel(
  bet: GroupSummaryActiveBet,
  now = Date.now()
): "Open" | "Locked" | "In play" {
  if (bet.status === "open") return "Open";
  const started =
    bet.resolvedLegCount > 0 ||
    (bet.firstKickoff != null &&
      new Date(bet.firstKickoff).getTime() <= now);
  return started ? "In play" : "Locked";
}

export function activeBetProgressLabel(bet: GroupSummaryActiveBet): string {
  if (bet.status === "open") {
    if (bet.yourLegCount < bet.legsPerMember) {
      const remaining = bet.legsPerMember - bet.yourLegCount;
      return remaining === 1
        ? "Your pick needed"
        : `${remaining} picks needed from you`;
    }
    if (bet.submittedLegCount === 0) return "Ready for the first pick";
    return `${bet.submittedLegCount}/${bet.requiredLegCount} picks`;
  }
  if (bet.resolvedLegCount > 0) {
    return `${bet.resolvedLegCount}/${bet.submittedLegCount} settled`;
  }
  return `${bet.submittedLegCount} leg${bet.submittedLegCount === 1 ? "" : "s"}`;
}

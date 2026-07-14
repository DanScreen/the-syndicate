import type { LegOutcome } from "@tiki-acca/shared";
import { overUnderLineFromType, asianHandicapLineFromType } from "@/lib/odds/market-groups";

/** Standard markets settle on 90-minute (regulation) score, not extra time. */

export type MatchResult = {
  homeGoals: number;
  awayGoals: number;
  status: string;
};

type LegForResolution = {
  marketType: string;
  selectionId: string;
};

const VOID_STATUSES = new Set(["POSTPONED", "CANCELLED", "SUSPENDED", "AWARDED"]);

function matchWinnerOutcome(
  selectionId: string,
  homeGoals: number,
  awayGoals: number
): LegOutcome {
  const winner =
    homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : "draw";
  return selectionId === winner ? "won" : "lost";
}

function overUnderOutcome(
  selectionId: string,
  totalGoals: number,
  line: number
): LegOutcome {
  const isOver = selectionId === "over";
  if (totalGoals === line) return "void";
  if (isOver) return totalGoals > line ? "won" : "lost";
  return totalGoals < line ? "won" : "lost";
}

function asianHandicapOutcome(
  selectionId: string,
  homeGoals: number,
  awayGoals: number
): LegOutcome {
  const match = selectionId.match(/^(home|away)_(-?\d+(?:\.\d+)?)$/);
  if (!match) return "lost";

  const side = match[1] as "home" | "away";
  const point = Number(match[2]);

  if (side === "home") {
    const adjusted = homeGoals + point;
    if (adjusted === awayGoals) return "void";
    return adjusted > awayGoals ? "won" : "lost";
  }

  const adjusted = awayGoals + point;
  if (adjusted === homeGoals) return "void";
  return adjusted > homeGoals ? "won" : "lost";
}

function bttsOutcome(selectionId: string, homeGoals: number, awayGoals: number): LegOutcome {
  const bothScored = homeGoals > 0 && awayGoals > 0;
  const won = selectionId === "yes" ? bothScored : !bothScored;
  return won ? "won" : "lost";
}

function doubleChanceOutcome(
  selectionId: string,
  homeGoals: number,
  awayGoals: number
): LegOutcome {
  const isDraw = homeGoals === awayGoals;
  const homeWins = homeGoals > awayGoals;
  const awayWins = awayGoals > homeGoals;

  const won =
    (selectionId === "home_draw" && (homeWins || isDraw)) ||
    (selectionId === "draw_away" && (isDraw || awayWins)) ||
    (selectionId === "home_away" && (homeWins || awayWins));

  return won ? "won" : "lost";
}

function drawNoBetOutcome(
  selectionId: string,
  homeGoals: number,
  awayGoals: number
): LegOutcome {
  if (homeGoals === awayGoals) return "void";
  const homeWins = homeGoals > awayGoals;
  const won =
    (selectionId === "home" && homeWins) || (selectionId === "away" && !homeWins);
  return won ? "won" : "lost";
}

function correctScoreOutcome(
  selectionId: string,
  homeGoals: number,
  awayGoals: number
): LegOutcome {
  const [home, away] = selectionId.split("_").map(Number);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return "lost";
  return home === homeGoals && away === awayGoals ? "won" : "lost";
}

export function resolveLegOutcome(leg: LegForResolution, result: MatchResult): LegOutcome | null {
  if (VOID_STATUSES.has(result.status)) return "void";
  if (result.status !== "FINISHED") return null;

  const { homeGoals, awayGoals } = result;
  const totalGoals = homeGoals + awayGoals;

  switch (leg.marketType) {
    case "match_winner":
      return matchWinnerOutcome(leg.selectionId, homeGoals, awayGoals);
    case "both_teams_score":
      return bttsOutcome(leg.selectionId, homeGoals, awayGoals);
    case "correct_score":
      return correctScoreOutcome(leg.selectionId, homeGoals, awayGoals);
    case "double_chance":
      return doubleChanceOutcome(leg.selectionId, homeGoals, awayGoals);
    case "draw_no_bet":
      return drawNoBetOutcome(leg.selectionId, homeGoals, awayGoals);
    default: {
      const ouLine = overUnderLineFromType(leg.marketType);
      if (ouLine !== null && leg.marketType.startsWith("over_under_")) {
        return overUnderOutcome(leg.selectionId, totalGoals, ouLine);
      }

      if (asianHandicapLineFromType(leg.marketType) !== null) {
        return asianHandicapOutcome(leg.selectionId, homeGoals, awayGoals);
      }

      return null;
    }
  }
}

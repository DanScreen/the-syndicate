import type { LegOutcome } from "@tiki-acca/shared";
import {
  asianHandicapLineFromType,
  embeddedOverUnderLineFromType,
  overUnderLineFromType,
  prefixedHandicapLineFromType,
} from "@/lib/odds/market-groups";
import { slugify } from "@/lib/odds/market-builders";

/** Standard markets settle on 90-minute (regulation) score, not extra time. */

export type ScorePair = { home: number; away: number };

export type MatchResult = {
  homeGoals: number;
  awayGoals: number;
  status: string;
  /** Match went to extra time / penalties (stats then cover 120'). */
  extraTime?: boolean;
  halfTime?: ScorePair | null;
  /**
   * Confirmed match stats in the leg's orientation. Present only once the
   * stats have been stable for STATS_CONFIRMATION_MS (see match-store).
   */
  stats?: { corners?: ScorePair | null } | null;
};

type LegForResolution = {
  marketType: string;
  selectionId: string;
  /** Needed for team-specific markets (team corners). */
  homeTeam?: string;
  awayTeam?: string;
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

/** True for markets settled from match stats rather than goals. */
export function isCornersMarket(marketType: string): boolean {
  return (
    marketType === "corners_1x2" ||
    marketType.startsWith("corners_") ||
    marketType.startsWith("team_corners__")
  );
}

/**
 * Corners markets. Bookmakers settle these on 90 minutes; our stats cover the
 * whole match, so extra-time matches return null (admin settles by hand).
 */
function resolveCornersLeg(leg: LegForResolution, result: MatchResult): LegOutcome | null {
  if (result.extraTime) return null;
  const corners = result.stats?.corners;
  if (!corners) return null;
  const { home, away } = corners;

  if (leg.marketType === "corners_1x2") {
    return matchWinnerOutcome(leg.selectionId, home, away);
  }

  const totalLine = overUnderLineFromType(leg.marketType);
  if (totalLine !== null && leg.marketType.startsWith("corners_over_under_")) {
    return overUnderOutcome(leg.selectionId, home + away, totalLine);
  }

  if (prefixedHandicapLineFromType(leg.marketType, "corners") !== null) {
    return asianHandicapOutcome(leg.selectionId, home, away);
  }

  if (leg.marketType.startsWith("team_corners__")) {
    const line = embeddedOverUnderLineFromType(leg.marketType);
    const teamSlug = leg.marketType.slice("team_corners__".length).replace(/__m?\d+$/, "");
    if (line === null || !teamSlug) return null;
    const side =
      leg.homeTeam && slugify(leg.homeTeam) === teamSlug
        ? "home"
        : leg.awayTeam && slugify(leg.awayTeam) === teamSlug
          ? "away"
          : null;
    if (!side) return null;
    return overUnderOutcome(leg.selectionId, side === "home" ? home : away, line);
  }

  return null;
}

export function resolveLegOutcome(leg: LegForResolution, result: MatchResult): LegOutcome | null {
  if (VOID_STATUSES.has(result.status)) return "void";
  if (result.status !== "FINISHED") return null;

  const { homeGoals, awayGoals } = result;
  const totalGoals = homeGoals + awayGoals;

  if (isCornersMarket(leg.marketType)) return resolveCornersLeg(leg, result);

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

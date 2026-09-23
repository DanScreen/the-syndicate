import type { Market } from "./types";

export type MarketGroup = {
  id: string;
  label: string;
  markets: Market[];
};

/**
 * Lines are embedded in market types as tenths: 2.5 → "25", 2 → "20", 10 → "100",
 * -1.5 → "m15". Zero is "0" and 0.5 is "05" so every half-line key minted before
 * whole lines were fixed stays byte-identical.
 *
 * Only whole and half lines are supported. Quarter (split) lines such as 2.25 would
 * need half-won / half-void settlement, which legs cannot represent — returns null
 * so builders skip those markets.
 */
export function encodeLineKey(line: number): string | null {
  if (!isSupportedLine(line)) return null;
  const tenths = Math.round(Math.abs(line) * 10);
  const digits = tenths === 0 ? "0" : String(tenths).padStart(2, "0");
  return line < 0 ? `m${digits}` : digits;
}

export function decodeLineKey(encoded: string): number {
  if (encoded.startsWith("m")) return -Number(encoded.slice(1)) / 10;
  return Number(encoded) / 10;
}

/** Whole or half line (…, -1, -0.5, 0, 0.5, 1, 1.5, …). */
export function isSupportedLine(line: number): boolean {
  return Number.isFinite(line) && Number.isInteger(line * 2);
}

function marketGroupId(type: string): string {
  if (type === "league_winner") return "outright";
  if (
    type === "match_winner" ||
    type.startsWith("double_chance") ||
    type === "to_qualify" ||
    type === "corners_1x2"
  ) {
    return "result";
  }
  if (
    type === "both_teams_score" ||
    type === "correct_score" ||
    type.startsWith("over_under_")
  ) {
    return "goals";
  }
  if (type.startsWith("corners_") || type.startsWith("team_corners__")) return "corners";
  if (type.startsWith("cards_")) return "cards";
  if (type.startsWith("asian_handicap_")) return "handicap";
  return "other";
}

const GROUP_LABELS: Record<string, string> = {
  outright: "Outrights",
  result: "Match result",
  goals: "Goals",
  handicap: "Handicap",
  corners: "Corners",
  cards: "Cards",
  other: "Other",
};

const GROUP_ORDER = ["outright", "result", "goals", "handicap", "corners", "cards", "other"];

export function groupMarkets(markets: Market[]): MarketGroup[] {
  const byGroup = new Map<string, Market[]>();

  for (const market of markets) {
    const id = marketGroupId(market.type);
    const list = byGroup.get(id) ?? [];
    list.push(market);
    byGroup.set(id, list);
  }

  return GROUP_ORDER.filter((id) => byGroup.has(id)).map((id) => ({
    id,
    label: GROUP_LABELS[id],
    markets: byGroup.get(id)!,
  }));
}

export function overUnderLineFromType(marketType: string): number | null {
  const match = marketType.match(/^(?:over_under|corners_over_under|cards_over_under)_(m?\d+)$/);
  if (!match) return null;
  return decodeLineKey(match[1]!);
}

/** Player / team totals with line encoded at end of type (e.g. player_shots__saka_25). */
export function embeddedOverUnderLineFromType(marketType: string): number | null {
  const match = marketType.match(/__(m?\d+)$/);
  if (!match) return null;
  return decodeLineKey(match[1]!);
}

export function asianHandicapLineFromType(marketType: string): number | null {
  const match = marketType.match(/^asian_handicap_(m?\d+)$/);
  if (!match) return null;
  return decodeLineKey(match[1]!);
}

export function prefixedHandicapLineFromType(
  marketType: string,
  prefix: "corners" | "cards"
): number | null {
  const match = marketType.match(new RegExp(`^${prefix}_handicap_(m?\\d+)$`));
  if (!match) return null;
  return decodeLineKey(match[1]!);
}

export function handicapLineFromType(marketType: string): number | null {
  return (
    asianHandicapLineFromType(marketType) ??
    prefixedHandicapLineFromType(marketType, "corners") ??
    prefixedHandicapLineFromType(marketType, "cards")
  );
}

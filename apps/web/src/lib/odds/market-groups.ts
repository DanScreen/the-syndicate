import type { Market } from "@the-syndicate/shared";

export type MarketGroup = {
  id: string;
  label: string;
  markets: Market[];
};

function decodeLineKey(encoded: string): number {
  if (encoded.startsWith("m")) return -Number(encoded.slice(1)) / 10;
  return Number(encoded) / 10;
}

function marketGroupId(type: string): string {
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
  result: "Match result",
  goals: "Goals",
  handicap: "Handicap",
  corners: "Corners",
  cards: "Cards",
  other: "Other",
};

const GROUP_ORDER = ["result", "goals", "handicap", "corners", "cards", "other"];

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

import type { Market } from "@the-syndicate/shared";

export type MarketGroup = {
  id: string;
  label: string;
  markets: Market[];
};

function marketGroupId(type: string): string {
  if (type === "match_winner" || type === "double_chance" || type === "draw_no_bet") {
    return "result";
  }
  if (type.startsWith("over_under_") || type === "both_teams_score") {
    return "goals";
  }
  if (type.startsWith("asian_handicap_")) {
    return "handicap";
  }
  return "other";
}

const GROUP_LABELS: Record<string, string> = {
  result: "Match result",
  goals: "Goals",
  handicap: "Handicap",
  other: "Other",
};

const GROUP_ORDER = ["result", "goals", "handicap", "other"];

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
  const match = marketType.match(/^over_under_(\d+)$/);
  if (!match) return null;
  return Number(match[1]) / 10;
}

export function asianHandicapLineFromType(marketType: string): number | null {
  const match = marketType.match(/^asian_handicap_(m?\d+)$/);
  if (!match) return null;
  const raw = match[1];
  if (raw.startsWith("m")) {
    return -Number(raw.slice(1)) / 10;
  }
  return Number(raw) / 10;
}

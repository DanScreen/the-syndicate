import type { Market } from "./types";

/** "Sat 13 Sept, 15:00" — used for kickoffs and pick cutoffs on web and mobile. */
export function formatKickoff(value: string | Date): string {
  return new Date(value).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function legOutcomeLabel(outcome: string): string {
  if (outcome === "won") return "Won";
  if (outcome === "lost") return "Lost";
  if (outcome === "void") return "Void";
  return "Awaiting";
}

/** Bulk fixture markets overlaid with the per-fixture extended markets (extended wins). */
export function mergeFixtureMarkets(bulk: Market[], extended: Market[]): Market[] {
  const byType = new Map<string, Market>();
  for (const market of bulk) byType.set(market.type, market);
  for (const market of extended) byType.set(market.type, market);
  return [...byType.values()];
}

type BetslipLeg = {
  fixtureLabel: string;
  marketLabel: string;
  selectionLabel: string;
  odds: number;
};

export function generateBetslipLink(
  bookmakerId: string,
  legs: BetslipLeg[],
  combinedOdds: number
): string {
  const legSummary = legs
    .map((l) => `${l.selectionLabel} (${l.odds})`)
    .join(" | ");

  const params = new URLSearchParams({
    type: "acca",
    legs: String(legs.length),
    odds: combinedOdds.toFixed(2),
    summary: legSummary,
  });

  const baseUrls: Record<string, string> = {
    bet365: "https://www.bet365.com/#/AC/B1/C1/D1002/E/",
    williamhill: "https://sports.williamhill.com/betting/en-gb/football",
    paddypower: "https://www.paddypower.com/football",
    skybet: "https://skybet.com/football",
  };

  const base = baseUrls[bookmakerId] ?? "https://example.com/betslip";
  return `${base}?${params.toString()}`;
}

export function findBestBookmaker(
  legs: { bookmakerId: string; odds: number }[]
): { bookmakerId: string; combinedOdds: number } {
  const byBookmaker = new Map<string, number>();

  for (const leg of legs) {
    const current = byBookmaker.get(leg.bookmakerId) ?? 1;
    byBookmaker.set(leg.bookmakerId, current * leg.odds);
  }

  let bestId = legs[0]?.bookmakerId ?? "bet365";
  let bestOdds = 0;

  for (const [id, combined] of byBookmaker) {
    if (combined > bestOdds) {
      bestOdds = combined;
      bestId = id;
    }
  }

  return { bookmakerId: bestId, combinedOdds: Number(bestOdds.toFixed(2)) };
}

export function calculateCombinedOdds(odds: number[]): number {
  return Number(odds.reduce((acc, o) => acc * o, 1).toFixed(2));
}

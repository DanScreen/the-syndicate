import type { Fixture } from "@tiki-acca/shared";

/**
 * World Cup fixtures seeded into the odds snapshot. One bookmaker per
 * selection keeps acca pricing deterministic, so specs can assert exact points.
 *
 * A settled outcome is a fact about the selection, so the server applies it to
 * every pending leg on that selection in every group. Specs that settle legs
 * therefore own their fixtures — share one and parallel runs settle each
 * other's accas. (So `--repeat-each` flakes the settling specs: the copies
 * share fixtures.)
 */

function kickoffInDays(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  d.setUTCHours(18, 0, 0, 0);
  return d.toISOString();
}

function matchWinner(
  id: string,
  homeTeam: string,
  awayTeam: string,
  days: number,
  [home, draw, away]: [number, number, number]
): Fixture {
  const quote = (odds: number) => [{ bookmakerId: "bet365", bookmakerName: "Bet365", odds }];
  return {
    id,
    homeTeam,
    awayTeam,
    competition: "FIFA World Cup",
    kickoff: kickoffInDays(days),
    markets: [
      {
        type: "match_winner",
        label: "Match Winner",
        selections: [
          { id: "home", label: homeTeam, odds: quote(home) },
          { id: "draw", label: "Draw", odds: quote(draw) },
          { id: "away", label: awayTeam, odds: quote(away) },
        ],
      },
    ],
  };
}

export const E2E_FIXTURES = {
  // golden-path.spec.ts (settles) — desktop project
  brazilJapan: matchWinner("e2e-bra-jpn", "Brazil", "Japan", 3, [2.1, 3.4, 3.6]),
  franceCanada: matchWinner("e2e-fra-can", "France", "Canada", 4, [1.8, 3.6, 4.5]),
  // golden-path.spec.ts (settles) — mobile project; same prices as above
  argentinaNigeria: matchWinner("e2e-arg-nga", "Argentina", "Nigeria", 3, [2.1, 3.4, 3.6]),
  netherlandsQatar: matchWinner("e2e-ned-qat", "Netherlands", "Qatar", 4, [1.8, 3.6, 4.5]),
  // settlement.spec.ts (settles)
  germanyMexico: matchWinner("e2e-ger-mex", "Germany", "Mexico", 3, [2.2, 3.3, 3.4]),
  portugalKorea: matchWinner("e2e-por-kor", "Portugal", "Korea", 4, [1.7, 3.7, 4.8]),
  // Never settled — free for any spec
  spainGhana: matchWinner("e2e-esp-gha", "Spain", "Ghana", 5, [1.5, 4.0, 6.5]),
  englandChile: matchWinner("e2e-eng-chi", "England", "Chile", 6, [1.65, 3.8, 5.0]),
  italyPeru: matchWinner("e2e-ita-per", "Italy", "Peru", 6, [1.9, 3.3, 4.2]),
} satisfies Record<string, Fixture>;

export type E2EFixture = (typeof E2E_FIXTURES)[keyof typeof E2E_FIXTURES];

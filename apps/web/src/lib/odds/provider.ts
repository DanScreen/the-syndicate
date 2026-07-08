import type { Fixture } from "@the-syndicate/shared";

const kickoff = (daysFromNow: number, hour = 15): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function getMockFixtures(): Fixture[] {
  return [
    {
      id: "fx-ars-liv",
      homeTeam: "Arsenal",
      awayTeam: "Liverpool",
      competition: "Premier League",
      kickoff: kickoff(2, 16),
      markets: [
        {
          type: "match_winner",
          label: "Match Winner",
          selections: [
            {
              id: "home",
              label: "Arsenal",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.1 },
                { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 2.05 },
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 2.0 },
              ],
            },
            {
              id: "draw",
              label: "Draw",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 3.4 },
                { bookmakerId: "paddypower", bookmakerName: "Paddy Power", odds: 3.5 },
              ],
            },
            {
              id: "away",
              label: "Liverpool",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 3.2 },
                { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 3.3 },
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 3.25 },
              ],
            },
          ],
        },
        {
          type: "both_teams_score",
          label: "Both Teams to Score",
          selections: [
            {
              id: "yes",
              label: "Yes",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.72 },
                { bookmakerId: "paddypower", bookmakerName: "Paddy Power", odds: 1.75 },
              ],
            },
            {
              id: "no",
              label: "No",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.05 },
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 2.0 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "fx-mci-che",
      homeTeam: "Man City",
      awayTeam: "Chelsea",
      competition: "Premier League",
      kickoff: kickoff(3, 14),
      markets: [
        {
          type: "match_winner",
          label: "Match Winner",
          selections: [
            {
              id: "home",
              label: "Man City",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.65 },
                { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 1.62 },
              ],
            },
            {
              id: "draw",
              label: "Draw",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 4.0 },
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 4.1 },
              ],
            },
            {
              id: "away",
              label: "Chelsea",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 5.0 },
                { bookmakerId: "paddypower", bookmakerName: "Paddy Power", odds: 5.25 },
              ],
            },
          ],
        },
        {
          type: "over_under_25",
          label: "Over/Under 2.5 Goals",
          selections: [
            {
              id: "over",
              label: "Over 2.5",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.8 },
                { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 1.78 },
              ],
            },
            {
              id: "under",
              label: "Under 2.5",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.0 },
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 1.95 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "fx-tot-new",
      homeTeam: "Tottenham",
      awayTeam: "Newcastle",
      competition: "Premier League",
      kickoff: kickoff(4, 17),
      markets: [
        {
          type: "match_winner",
          label: "Match Winner",
          selections: [
            {
              id: "home",
              label: "Tottenham",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.3 },
                { bookmakerId: "paddypower", bookmakerName: "Paddy Power", odds: 2.35 },
              ],
            },
            {
              id: "draw",
              label: "Draw",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 3.3 },
              ],
            },
            {
              id: "away",
              label: "Newcastle",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.9 },
                { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 2.85 },
              ],
            },
          ],
        },
      ],
    },
  ];
}

export function findFixture(fixtureId: string): Fixture | undefined {
  return getMockFixtures().find((f) => f.id === fixtureId);
}

export function findSelection(
  fixtureId: string,
  marketType: string,
  selectionId: string
) {
  const fixture = findFixture(fixtureId);
  if (!fixture) return null;
  const market = fixture.markets.find((m) => m.type === marketType);
  if (!market) return null;
  const selection = market.selections.find((s) => s.id === selectionId);
  if (!selection) return null;
  return { fixture, market, selection };
}

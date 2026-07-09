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
      id: "fx-mex-kor",
      homeTeam: "Mexico",
      awayTeam: "South Korea",
      competition: "FIFA World Cup",
      kickoff: kickoff(2, 16),
      markets: [
        {
          type: "match_winner",
          label: "Match Winner",
          selections: [
            {
              id: "home",
              label: "Mexico",
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
              label: "South Korea",
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
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 1.73 },
              ],
            },
            {
              id: "no",
              label: "No",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.05 },
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 2.0 },
                { bookmakerId: "betway", bookmakerName: "Betway", odds: 2.02 },
              ],
            },
          ],
        },
        {
          type: "over_under_15",
          label: "Over/Under 1.5 Goals",
          selections: [
            {
              id: "over",
              label: "Over 1.5",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.28 },
                { bookmakerId: "ladbrokes_uk", bookmakerName: "Ladbrokes", odds: 1.26 },
              ],
            },
            {
              id: "under",
              label: "Under 1.5",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 3.5 },
                { bookmakerId: "coral", bookmakerName: "Coral", odds: 3.4 },
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
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.85 },
                { bookmakerId: "paddypower", bookmakerName: "Paddy Power", odds: 1.83 },
              ],
            },
            {
              id: "under",
              label: "Under 2.5",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.95 },
                { bookmakerId: "unibet_uk", bookmakerName: "Unibet", odds: 1.92 },
              ],
            },
          ],
        },
        {
          type: "asian_handicap_m05",
          label: "Asian Handicap -0.5",
          selections: [
            {
              id: "home_-0.5",
              label: "Mexico -0.5",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.05 },
                { bookmakerId: "betway", bookmakerName: "Betway", odds: 2.0 },
              ],
            },
            {
              id: "away_0.5",
              label: "South Korea +0.5",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.78 },
                { bookmakerId: "boylesports", bookmakerName: "BoyleSports", odds: 1.8 },
              ],
            },
          ],
        },
        {
          type: "double_chance",
          label: "Double Chance",
          selections: [
            {
              id: "home_draw",
              label: "Mexico or Draw",
              odds: [
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 1.35 },
                { bookmakerId: "coral", bookmakerName: "Coral", odds: 1.33 },
              ],
            },
            {
              id: "draw_away",
              label: "Draw or South Korea",
              odds: [
                { bookmakerId: "skybet", bookmakerName: "Sky Bet", odds: 1.55 },
                { bookmakerId: "ladbrokes_uk", bookmakerName: "Ladbrokes", odds: 1.53 },
              ],
            },
            {
              id: "home_away",
              label: "Mexico or South Korea",
              odds: [
                { bookmakerId: "paddypower", bookmakerName: "Paddy Power", odds: 1.28 },
                { bookmakerId: "betvictor", bookmakerName: "BetVictor", odds: 1.27 },
              ],
            },
          ],
        },
        {
          type: "draw_no_bet",
          label: "Draw No Bet",
          selections: [
            {
              id: "home",
              label: "Mexico",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 1.55 },
                { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 1.53 },
              ],
            },
            {
              id: "away",
              label: "South Korea",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.35 },
                { bookmakerId: "unibet_uk", bookmakerName: "Unibet", odds: 2.3 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "fx-eng-fr",
      homeTeam: "England",
      awayTeam: "France",
      competition: "FIFA World Cup",
      kickoff: kickoff(3, 14),
      markets: [
        {
          type: "match_winner",
          label: "Match Winner",
          selections: [
            {
              id: "home",
              label: "England",
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
              label: "France",
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
      id: "fx-usa-aus",
      homeTeam: "USA",
      awayTeam: "Australia",
      competition: "FIFA World Cup",
      kickoff: kickoff(4, 17),
      markets: [
        {
          type: "match_winner",
          label: "Match Winner",
          selections: [
            {
              id: "home",
              label: "USA",
              odds: [
                { bookmakerId: "bet365", bookmakerName: "Bet365", odds: 2.3 },
                { bookmakerId: "paddypower", bookmakerName: "Paddy Power", odds: 2.35 },
              ],
            },
            {
              id: "draw",
              label: "Draw",
              odds: [{ bookmakerId: "bet365", bookmakerName: "Bet365", odds: 3.3 }],
            },
            {
              id: "away",
              label: "Australia",
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

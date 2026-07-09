export type Competition = {
  id: string;
  name: string;
  oddsApiSport: string;
  footballDataCode: string;
};

export const COMPETITIONS: Competition[] = [
  {
    id: "epl",
    name: "Premier League",
    oddsApiSport: "soccer_epl",
    footballDataCode: "PL",
  },
  {
    id: "championship",
    name: "Championship",
    oddsApiSport: "soccer_efl_champ",
    footballDataCode: "ELC",
  },
  {
    id: "league-one",
    name: "League One",
    oddsApiSport: "soccer_england_league1",
    footballDataCode: "EL1",
  },
  {
    id: "league-two",
    name: "League Two",
    oddsApiSport: "soccer_england_league2",
    footballDataCode: "EL2",
  },
  {
    id: "world-cup",
    name: "FIFA World Cup",
    oddsApiSport: "soccer_fifa_world_cup",
    footballDataCode: "WC",
  },
];

export const DEFAULT_COMPETITION_ID = "world-cup";

export function getCompetitionById(id: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.id === id);
}

export function getCompetitionByOddsApiSport(sport: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.oddsApiSport === sport);
}

export function isValidCompetitionId(id: string): boolean {
  return COMPETITIONS.some((c) => c.id === id);
}

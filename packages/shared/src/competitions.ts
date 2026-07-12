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
    id: "la-liga",
    name: "La Liga",
    oddsApiSport: "soccer_spain_la_liga",
    footballDataCode: "PD",
  },
  {
    id: "ligue-1",
    name: "Ligue 1",
    oddsApiSport: "soccer_france_ligue_one",
    footballDataCode: "FL1",
  },
  {
    id: "serie-a",
    name: "Serie A",
    oddsApiSport: "soccer_italy_serie_a",
    footballDataCode: "SA",
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    oddsApiSport: "soccer_germany_bundesliga",
    footballDataCode: "BL1",
  },
  {
    id: "world-cup",
    name: "FIFA World Cup",
    oddsApiSport: "soccer_fifa_world_cup",
    footballDataCode: "WC",
  },
];

export const DEFAULT_COMPETITION_ID = "world-cup";

/** Competitions enabled for new picks when no DB settings exist yet. */
export const DEFAULT_ENABLED_COMPETITION_IDS = ["world-cup"] as const;

export function getCompetitionById(id: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.id === id);
}

export function getCompetitionByOddsApiSport(sport: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.oddsApiSport === sport);
}

export function isValidCompetitionId(id: string): boolean {
  return COMPETITIONS.some((c) => c.id === id);
}

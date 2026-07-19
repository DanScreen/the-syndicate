export type Competition = {
  id: string;
  name: string;
  oddsApiSport: string;
  /**
   * football-data.org competition code used for automatic result sync.
   * Empty for competitions not covered by our football-data.org tier
   * (see `manualSettlement`) — those are settled by hand in the admin queue.
   */
  footballDataCode: string;
  /**
   * When true, results are not available from football-data.org on our current
   * tier, so match sync is skipped and legs must be settled manually by an admin.
   */
  manualSettlement?: boolean;
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
    id: "eredivisie",
    name: "Eredivisie",
    oddsApiSport: "soccer_netherlands_eredivisie",
    footballDataCode: "DED",
  },
  {
    id: "primeira-liga",
    name: "Primeira Liga",
    oddsApiSport: "soccer_portugal_primeira_liga",
    footballDataCode: "PPL",
  },
  {
    id: "brazil-serie-a",
    name: "Brazil Série A",
    oddsApiSport: "soccer_brazil_campeonato",
    footballDataCode: "BSA",
  },
  {
    id: "champions-league",
    name: "UEFA Champions League",
    oddsApiSport: "soccer_uefa_champs_league",
    footballDataCode: "CL",
  },
  {
    id: "european-championship",
    name: "UEFA European Championship",
    oddsApiSport: "soccer_uefa_european_championship",
    footballDataCode: "EC",
  },
  {
    id: "copa-libertadores",
    name: "Copa Libertadores",
    oddsApiSport: "soccer_conmebol_copa_libertadores",
    footballDataCode: "CLI",
  },
  {
    id: "world-cup",
    name: "FIFA World Cup",
    oddsApiSport: "soccer_fifa_world_cup",
    footballDataCode: "WC",
  },
  {
    id: "champions-league-qual",
    name: "Champions League Qualification",
    oddsApiSport: "soccer_uefa_champs_league_qualification",
    // Not on our football-data.org tier — settled manually.
    footballDataCode: "",
    manualSettlement: true,
  },
  {
    id: "europa-league",
    name: "Europa League",
    oddsApiSport: "soccer_uefa_europa_league",
    // Not on our football-data.org tier — settled manually.
    footballDataCode: "",
    manualSettlement: true,
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

/** Competitions with no automatic result sync — legs are settled by hand. */
export function competitionNeedsManualSettlement(competition: Competition): boolean {
  return competition.manualSettlement === true || competition.footballDataCode === "";
}

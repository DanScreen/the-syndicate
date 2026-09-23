export type Competition = {
  id: string;
  name: string;
  oddsApiSport: string;
  /**
   * football-data.org competition code used for automatic result sync.
   * Empty for competitions not on our football-data.org (free) tier.
   */
  footballDataCode: string;
  /**
   * API-Football league id (results, match stats). Verify with
   * `GET /leagues?id=<id>` before adding. Where both this and
   * `footballDataCode` are set, results settle from the two feeds' consensus.
   */
  apiFootballLeagueId?: number;
  /**
   * When true, no results feed covers this competition, so match sync is
   * skipped and legs must be settled manually by an admin.
   */
  manualSettlement?: boolean;
  /**
   * The Odds API sport key for this competition's outright/futures markets, a
   * separate sport key from `oddsApiSport` per their API.
   *
   * Only set this after confirming the key is real: The Odds API exposes
   * outrights for a *very* small set of competitions, and the only soccer one
   * is `soccer_fifa_world_cup_winner`. Plausible-looking keys such as
   * `soccer_epl_winner` do not exist and return 404 UNKNOWN_SPORT. Verify with:
   *
   *   GET /v4/sports?all=true  →  entries with `has_outrights: true`
   *
   * Omitted everywhere else, so outrights simply don't show for those.
   */
  outrightOddsApiSport?: string;
};

export const COMPETITIONS: Competition[] = [
  {
    id: "epl",
    name: "Premier League",
    oddsApiSport: "soccer_epl",
    apiFootballLeagueId: 39,
    footballDataCode: "PL",
  },
  {
    id: "championship",
    name: "Championship",
    oddsApiSport: "soccer_efl_champ",
    apiFootballLeagueId: 40,
    footballDataCode: "ELC",
  },
  {
    id: "league-one",
    name: "League One",
    oddsApiSport: "soccer_england_league1",
    // football-data.org code is EL1 but it is not on the free tier.
    footballDataCode: "",
    apiFootballLeagueId: 41,
  },
  {
    id: "league-two",
    name: "League Two",
    oddsApiSport: "soccer_england_league2",
    // football-data.org code is EL2 but it is not on the free tier.
    footballDataCode: "",
    apiFootballLeagueId: 42,
  },
  {
    id: "la-liga",
    name: "La Liga",
    oddsApiSport: "soccer_spain_la_liga",
    apiFootballLeagueId: 140,
    footballDataCode: "PD",
  },
  {
    id: "ligue-1",
    name: "Ligue 1",
    oddsApiSport: "soccer_france_ligue_one",
    apiFootballLeagueId: 61,
    footballDataCode: "FL1",
  },
  {
    id: "serie-a",
    name: "Serie A",
    oddsApiSport: "soccer_italy_serie_a",
    apiFootballLeagueId: 135,
    footballDataCode: "SA",
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    oddsApiSport: "soccer_germany_bundesliga",
    apiFootballLeagueId: 78,
    footballDataCode: "BL1",
  },
  {
    id: "eredivisie",
    name: "Eredivisie",
    oddsApiSport: "soccer_netherlands_eredivisie",
    apiFootballLeagueId: 88,
    footballDataCode: "DED",
  },
  {
    id: "primeira-liga",
    name: "Primeira Liga",
    oddsApiSport: "soccer_portugal_primeira_liga",
    apiFootballLeagueId: 94,
    footballDataCode: "PPL",
  },
  {
    id: "brazil-serie-a",
    name: "Brazil Série A",
    oddsApiSport: "soccer_brazil_campeonato",
    apiFootballLeagueId: 71,
    footballDataCode: "BSA",
  },
  {
    id: "champions-league",
    name: "UEFA Champions League",
    oddsApiSport: "soccer_uefa_champs_league",
    apiFootballLeagueId: 2,
    footballDataCode: "CL",
  },
  {
    id: "european-championship",
    name: "UEFA European Championship",
    oddsApiSport: "soccer_uefa_european_championship",
    apiFootballLeagueId: 4,
    footballDataCode: "EC",
  },
  {
    id: "copa-libertadores",
    name: "Copa Libertadores",
    oddsApiSport: "soccer_conmebol_copa_libertadores",
    apiFootballLeagueId: 13,
    footballDataCode: "CLI",
  },
  {
    id: "world-cup",
    name: "FIFA World Cup",
    oddsApiSport: "soccer_fifa_world_cup",
    apiFootballLeagueId: 1,
    footballDataCode: "WC",
    // The only soccer outright key The Odds API actually offers. Currently
    // inactive (next edition is 2030) so it returns an empty field until
    // bookmakers start pricing it.
    outrightOddsApiSport: "soccer_fifa_world_cup_winner",
  },
  {
    id: "champions-league-qual",
    name: "Champions League Qualification",
    oddsApiSport: "soccer_uefa_champs_league_qualification",
    // Not on our football-data.org tier. API-Football lists the qualifying
    // rounds under the Champions League itself (league 2).
    footballDataCode: "",
    apiFootballLeagueId: 2,
  },
  {
    id: "europa-league",
    name: "Europa League",
    oddsApiSport: "soccer_uefa_europa_league",
    // Not on our football-data.org tier.
    footballDataCode: "",
    apiFootballLeagueId: 3,
  },
  {
    id: "efl-cup",
    name: "Carabao Cup",
    // The Odds API title is "EFL Cup"; Carabao is the current sponsor name
    // UK fans use. football-data.org code is FLC but it is not on the free
    // tier (Tier 2+).
    oddsApiSport: "soccer_england_efl_cup",
    footballDataCode: "",
    apiFootballLeagueId: 48,
  },
  {
    id: "nations-league",
    name: "UEFA Nations League",
    oddsApiSport: "soccer_uefa_nations_league",
    // Not on football-data.org's free tier.
    footballDataCode: "",
    apiFootballLeagueId: 5,
  },
  {
    id: "fa-cup",
    name: "FA Cup",
    // Inactive on The Odds API until bookmakers price the proper rounds
    // (first round, November). football-data.org FAC is not on the free tier.
    oddsApiSport: "soccer_fa_cup",
    footballDataCode: "",
    apiFootballLeagueId: 45,
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
  if (competition.manualSettlement === true) return true;
  return competition.footballDataCode === "" && !competition.apiFootballLeagueId;
}

/** Results feeds that cover this competition, in consensus order. */
export function competitionResultsProviders(
  competition: Competition
): ("api_football" | "football_data")[] {
  const providers: ("api_football" | "football_data")[] = [];
  if (competition.apiFootballLeagueId) providers.push("api_football");
  if (competition.footballDataCode) providers.push("football_data");
  return providers;
}

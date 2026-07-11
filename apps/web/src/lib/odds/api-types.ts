export type OddsApiOutcome = {
  name: string;
  price: number;
  point?: number;
  link?: string | null;
  description?: string | null;
};

export type OddsApiMarket = {
  key: string;
  outcomes: OddsApiOutcome[];
  link?: string | null;
};

export type OddsApiBookmaker = {
  key: string;
  title: string;
  markets: OddsApiMarket[];
  link?: string | null;
};

export type OddsApiEvent = {
  id: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
};

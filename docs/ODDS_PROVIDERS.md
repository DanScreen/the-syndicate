# Odds & results provider evaluation

**Date:** 2026-07-28 · **Status:** research complete, decisions open

Findings from evaluating outright (season-long) market coverage and results
coverage across odds API providers. Written after a proposed outrights feature
was found to be built against sport keys that do not exist.

**Read this before adding any outright market, or before adding a provider.**

---

## TL;DR

1. **The Odds API does not offer soccer outrights.** Five of the six
   `outrightOddsApiSport` keys in `competitions.ts` were invented and return
   404. Verified against the live API.
2. **Top goalscorer, relegation, top-4/Europe and top-half markets are not
   available from The Odds API at all**, for any competition.
3. **Most odds APIs are fixture-scoped and structurally cannot serve
   outrights.** This is not a "pick a better vendor" problem.
4. **The entire "Corners & cards" market tier is offered but cannot be
   auto-settled.** BetsAPI could close most of that gap; player-to-score it
   could not.

---

## 1. The Odds API: outright coverage

### What was found

A proposed change added outright ("team to win the league") markets using sport
keys following The Odds API's real naming convention:

```
soccer_epl_winner, soccer_spain_la_liga_winner, soccer_france_ligue_one_winner,
soccer_italy_serie_a_winner, soccer_germany_bundesliga_winner,
soccer_uefa_champs_league_winner
```

**None of those exist.** Probed directly with our live key:

```
soccer_epl_winner                 → HTTP 404 UNKNOWN_SPORT
soccer_spain_la_liga_winner       → HTTP 404 UNKNOWN_SPORT
soccer_uefa_champs_league_winner  → HTTP 404 UNKNOWN_SPORT
soccer_germany_bundesliga_winner  → HTTP 404 UNKNOWN_SPORT
soccer_fifa_world_cup_winner      → HTTP 200  []
```

The keys look plausible because the convention is real —
`americanfootball_nfl_super_bowl_winner` and `golf_masters_tournament_winner`
are genuine. There is simply no league-winner feed for any European league.

### The authoritative check

`GET /v4/sports?all=true` returns 173 sports. Exactly **12** have
`has_outrights: true`, and only one is soccer:

```
americanfootball_ncaaf_championship_winner    basketball_nba_championship_winner
americanfootball_nfl_super_bowl_winner        basketball_ncaab_championship_winner
baseball_mlb_world_series_winner              icehockey_nhl_championship_winner
golf_masters_tournament_winner                golf_pga_championship_winner
golf_the_open_championship_winner             golf_us_open_winner
politics_us_presidential_election_winner
soccer_fifa_world_cup_winner        ← the only soccer one; active=False (2030)
```

Reproduce:

```bash
curl -s "https://api.the-odds-api.com/v4/sports?all=true&apiKey=$ODDS_API_KEY" \
  | python3 -c "import json,sys; [print(s['key'], s['active']) \
      for s in json.load(sys.stdin) if s.get('has_outrights')]"
```

### Markets that are NOT available

| Market | Available? | Notes |
|---|---|---|
| League winner | **No** | No `*_winner` sport key exists for any league |
| Top goalscorer (season) | **No** | Not offered in any form |
| Relegation | **No** | — |
| Qualify for Europe / top 4 | **No** | — |
| Top / bottom half finish | **No** | — |
| Anytime / first / last goalscorer | Per-match only | `player_goal_scorer_anytime` etc., **US bookmakers only** for soccer |

Vendor marketing and third-party comparison blogs claim "top scorer races and
relegation markets". The `/sports` response is the authority and contradicts
them. Treat marketing copy as unreliable.

### What was changed in response

- Removed the five 404ing keys from `packages/shared/src/competitions.ts`.
- Set `soccer_fifa_world_cup_winner` on `world-cup` (the only real key; inactive
  until bookmakers price the 2030 tournament, so it returns `[]`).
- Documented the `/v4/sports?all=true` verification step on the
  `outrightOddsApiSport` field so the next person checks before adding one.
- `mapOutrightEventsToMarkets` now maps **every** returned event and takes each
  label from the feed, instead of reading `events[0]` and hardcoding
  `"league_winner"` / `"League Winner"`.
- Failed outright fetches are now negative-cached
  (`ODDS_OUTRIGHT_FAILURE_TTL_MS`, default 1h). Previously a permanent 404 meant
  every page load re-hit the API indefinitely.

The outright plumbing (homogeneous rounds, manual settlement, admin badge) is
sound and remains in place — it is **dormant, not broken**.

### How it is kept dormant

`OUTRIGHTS_ENABLED` (default **off**; must be the exact string `"true"`).

- `outrightsEnabled()` in `apps/web/src/lib/odds/config.ts`.
- Gated in `getOutrightFixture` (`provider.ts`) — the single choke point for the
  web picker, the mobile picker **and** leg creation, since the API validates
  through `findSelection → findFixture → getFixtures`. No separate UI or route
  changes are needed to hide the feature.
- `warmOddsCache` skips the outright refresh while off, so a dormant feature
  costs no API quota.
- Pinned by `src/lib/odds/outrights-flag.test.ts`.

**Deliberately a flag rather than "the feed is empty".** Relying on emptiness
would let the feature surface unannounced if a feed ever went live — and there
is a latent bug waiting if it did: `getOutrightFixture` sets the synthetic
kickoff from `currentSeasonEndDate()` (next 31 May), which is correct for a
domestic league but wrong for `soccer_fifa_world_cup_winner`, whose market
settles in 2030. A round would lock and report overdue roughly three years
early. Re-check that date logic before enabling for any non-league competition.

---

## 2. Why this is structural, not a vendor choice

Most odds APIs are **fixture-scoped**: the core endpoint is "odds for event X".
An outright has no fixture — "Arsenal to win the league" has no kickoff — so
those APIs cannot express it. That is precisely why The Odds API models
outrights as separate pseudo-sports rather than as a market key.

Verified by grepping full documentation corpora:

- **Sportmonks** — 889 KB of docs, **zero** occurrences of `outright`. Its 87
  `topscorer` hits are the *stats* endpoint (who has scored most), not a
  betting market.
- **odds-api.io** — full docs, **zero** occurrences of `outright` or `futures`,
  despite 265+ bookmakers and 12,000+ leagues.

**Consequence:** "more bookmakers and more leagues" and "has outrights" are
close to orthogonal. The large aggregators are large on *match* markets.

---

## 3. Provider comparison

Requirements used: football (soccer) only · as many leagues and bookmakers as
possible · 20–50k queries/month · UK bookmakers prioritised.

| Provider | Football coverage | Bookmakers | UK | Outrights | ~Cost at our volume |
|---|---|---|---|---|---|
| **Betfair Exchange** | All major leagues | 1 (exchange) | Native UK | **Yes** — Winner, Relegation, Top Goalscorer are first-class market types | Free app key |
| **BetsAPI** | Broad | ~5, full depth each | Bet365, Betfair, Betway | **Likely** — "all odds markets you find on the related website" | From ~$10/mo |
| **UK Odds API** | Football only | 28 UK books | Purpose-built UK | Unconfirmed; "football specials" (next manager, awards) on Business tier | £149–359/mo |
| **odds-api.io** | 12,000+ leagues | 265+, **tier-gated to 2/5/10/15** | Named UK books | **No** (verified) | £99–229/mo |
| **Sportmonks** | Strong, football-only | 120+ via TXOdds add-on | Yes | **No** (verified) | €14–69 add-on |
| **OpticOdds / LSports / Sportradar** | Enterprise-grade | 100+ | Yes | Yes | ~$5,000/mo+ |
| **The Odds API** (current) | Good, all our leagues | 50+ UK/EU/AU | Yes | **Soccer: no** | $99/mo Business tier |

### Notes and traps

- **Volume is not our constraint.** 20–50k/month sits comfortably inside every
  paid tier; most quote 5,000 requests *per hour*. Bookmaker count and outright
  coverage are the real variables.
- **odds-api.io's "265+ bookmakers" is tier-gated** — £229/mo buys access to 15
  of them. That directly contradicts the "as many bookmakers as possible"
  requirement, and it has no outrights regardless.
- **Betfair is one price, not a spread**, but exchange prices are the sharpest
  reference available, and one real price beats many that do not exist. Setup
  cost is non-trivial: certificate-based login plus an app key.

### Recommendation (not yet actioned)

**Keep The Odds API for match markets; add a second source for outrights only.**
The existing fixture integration works and should not be replaced to chase
outrights. The outright path is already isolated behind `outrightOddsApiSport`
and `refreshOutrightMarketsFromApi`, so a second provider slots in there without
touching the fixture path.

For that second source, **Betfair Exchange first** — free, UK-native, and
unambiguously carries league winner, relegation and top goalscorer as standard
market types. **BetsAPI** is the fallback if a bookmaker spread matters more
than cost.

### Confidence

Only The Odds API was verified by probing a live key. Everything else in the
table is from vendor docs and pricing pages. Absence of a documented feature was
verified by grep; **presence** of a working feed was not verified for any
alternative. Do not commit to a provider on documentation alone — trial and
probe first, exactly as was done for The Odds API.

---

## 4. Results coverage: the settlement gap

### What we cannot settle today

`apps/web/src/lib/results/resolve-leg.ts` handles `match_winner`,
`both_teams_score`, `correct_score`, `double_chance`, `draw_no_bet`,
`over_under_*` and `asian_handicap_*`, and returns `null` for everything else.
`MatchResult` carries only `{ homeGoals, awayGoals, status }`.

**The entire "Corners & cards" specials tier is offered in the picker but cannot
be auto-settled.** Every such leg falls through to the admin queue:

```
corners_1x2, alternate_spreads_corners, alternate_totals_corners,
alternate_team_totals_corners, alternate_spreads_cards,
alternate_totals_cards, to_qualify
```

### The `over_under_` guard is load-bearing — do not remove it

`resolve-leg.ts:127` reads:

```ts
const ouLine = overUnderLineFromType(leg.marketType);
if (ouLine !== null && leg.marketType.startsWith("over_under_")) {
  return overUnderOutcome(leg.selectionId, totalGoals, ouLine);
}
```

`overUnderLineFromType` deliberately matches `over_under_*`,
`corners_over_under_*` **and** `cards_over_under_*`, so it returns a line for
corner and card totals too. The `startsWith` guard is what stops those falling
into `overUnderOutcome`, which settles against **`totalGoals`**.

Removing the guard would not "enable" corner settlement — it would silently
settle *"Over 9.5 corners"* against the **goal** count, marking bets won and
lost on the wrong statistic with no error. The guard is correct given that
`MatchResult` carries only goals.

Corners and cards need a new resolver branch reading new fields, not a relaxed
guard.

### BetsAPI as a results source

The `williamhill/result` endpoint returns (verified from the published sample
payload):

```json
"stats": {
  "corners":     ["4", "6"],
  "yellowcards": ["1", "4"],
  "redcards":    ["0", "0"],
  "goals":       ["0", "2"],
  "penalties":   ["1", "0"],
  "on_target":   ["2", "6"], ...
},
"scores": { "1": {home,away},   // half time
            "2": {home,away} }, // full time
"events": [ { "text": "4' - 1st Corner - Cruz Azul" }, ... ]
```

| Market | Settleable from this? | Notes |
|---|---|---|
| **Corners** (totals, handicaps, 1X2, team totals) | **Yes** | `stats.corners` is home/away counts — exactly what these settle on |
| **Cards** | **Partially** | Yellow/red *counts* only. Card markets settle on **booking points** (yellow 10, red 25), and a second-yellow red scores differently from a straight red. The payload cannot distinguish them |
| **Player to score** | **No** | Zero `scorer`/`player` fields. The `events` timeline is corners and aggregate goals, not goalscorer names |
| **Half-time markets / HT-FT** | Yes | `scores` is per-period |
| **`to_qualify`** | No | Depends on two-legged ties and extra time |

We do not currently offer player props anyway — they are absent from both market
tiers, and The Odds API restricts soccer player props to US bookmakers.

### Integration caveat

The William Hill endpoint is keyed by **William Hill's `event_id`**, from their
XML feed — an id we would only hold if already consuming that feed. Legs are
currently matched to results by team name and kickoff against football-data.org.
Adding this introduces a third id space and a second fuzzy-matching layer, which
is where results pipelines typically rot.

**If we proceed, use BetsAPI's general Results / Event View API, not the
William Hill-specific one.** Same `stats` structure, but keyed by BetsAPI's own
event ids with search and merge-history endpoints for mapping. The William Hill
variant buys nothing extra and costs a harder join. Its docs also note only
soccer is supported and ~2% of events are uncovered — the former is fine, the
latter means keeping the manual queue as a fallback regardless.

---

## 5. Open decisions

| # | Decision | Status |
|---|---|---|
| 1 | Keep outrights dormant, drop the feature, or integrate a second provider | **Resolved** — kept, gated off behind `OUTRIGHTS_ENABLED` |
| 1b | Fix `currentSeasonEndDate()` for non-league outrights (World Cup settles 2030, not next May) | **Open** — blocks enabling the flag |
| 2 | Corners/cards settlement — needs a stats source + resolver branches, **not** a guard change | **Open** |
| 3 | Trial BetsAPI ($1/one-day) and probe id-mapping quality | **Open** |
| 4 | Cards: booking-point approximation vs. keep manual | **Open** — decide deliberately, not by default |
| 5 | Extend `MatchResult` beyond `{homeGoals, awayGoals, status}` | Blocked on #3 |

---

## 6. Rules of thumb

1. **Never add an `outrightOddsApiSport` key without probing it.** Plausible
   naming is not evidence. Use `/v4/sports?all=true` and check `has_outrights`.
2. **Do not trust vendor marketing or comparison blogs.** Many "best odds API"
   comparison posts are authored by the vendors they rank. Go to the API itself.
3. **Check whether a provider is fixture-scoped** before assuming it can serve
   season-long markets.
4. **Negative-cache external failures.** A 404 from a misconfigured key never
   self-heals and will hammer the provider on every page load.

---

## Sources

- [The Odds API — v4 docs](https://the-odds-api.com/liveapi/guides/v4/) ·
  [betting markets list](https://the-odds-api.com/sports-odds-data/betting-markets.html)
- [BetsAPI docs](https://betsapi.com/docs/) ·
  [WilliamHill Result](https://betsapi.com/docs/results/williamhill.html) ·
  [pricing](https://b365api.com/pricing.html)
- [odds-api.io](https://odds-api.io/) · [pricing](https://odds-api.io/pricing) ·
  [football](https://odds-api.io/sports/football)
- [UK Odds API](https://ukoddsapi.com/)
- [Sportmonks plans & pricing](https://www.sportmonks.com/football-api/plans-pricing/) ·
  [premium odds feed](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/premium-odds-feed)
- [Betfair developer portal](https://developer.betfair.com/get-started/)
- [SportsGameOdds pricing](https://sportsgameodds.com/pricing/) ·
  [OpticOdds](https://opticodds.com/sports/soccer) ·
  [LSports](https://www.lsports.eu/blog/sports-betting-apis/)

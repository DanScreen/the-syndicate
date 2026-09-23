# Odds & results provider evaluation

**Date:** 2026-07-28 · **Status:** research complete, decisions open

Findings from evaluating outright (season-long) market coverage and results
coverage across odds API providers. Written after a proposed outrights feature
was found to be built against sport keys that do not exist.

**Read this before adding any outright market, or before adding a provider.**

> **Update 2026-09-22.** [§7](#7-september-2026-re-evaluation) re-evaluates providers against a
> **≤ £100/month budget for odds + results combined**. It **corrects** the Betfair
> recommendation in §3 (the free key isn't licensed for commercial display) and
> The Odds API pricing in the §3 table. The proposed plan is
> [specs/odds-and-results-sourcing.md](./specs/odds-and-results-sourcing.md).

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
| **Betfair Exchange** | All major leagues | 1 (exchange) | Native UK | **Yes** — Winner, Relegation, Top Goalscorer are first-class market types | ~~Free app key~~ **Not free for commercial use** (§7 correction) |
| **BetsAPI** | Broad | ~5, full depth each | Bet365, Betfair, Betway | **Likely** — "all odds markets you find on the related website" | From ~$10/mo |
| **UK Odds API** | Football only | 28 UK books | Purpose-built UK | Unconfirmed; "football specials" (next manager, awards) on Business tier | £149–359/mo (Sept 2026: Starter £49/mo for 10 UK books; see §7) |
| **odds-api.io** | 12,000+ leagues | 265+, **tier-gated to 2/5/10/15** | Named UK books | **No** (verified) | £99–229/mo |
| **Sportmonks** | Strong, football-only | 120+ via TXOdds add-on | Yes | **No** (verified) | €14–69 add-on |
| **OpticOdds / LSports / Sportradar** | Enterprise-grade | 100+ | Yes | Yes | ~$5,000/mo+ |
| **The Odds API** (current) | Good, all our leagues | 50+ UK/EU/AU | Yes | **Soccer: no** | $30 (20K credits) / $59 (100K) / $119 (5M). There is no $99 tier (§7 correction) |

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

> **Correction (2026-09-22):** Betfair is **not** a free source for us.
>
> - The free *delayed* app key is for development/testing and private betting.
> - Any commercial use of the data needs Betfair's approval.
> - The software-vendor licence costs £999.
>
> Don't build on Betfair without that approval. See [§7](#7-september-2026-re-evaluation).

### Confidence

Only The Odds API was verified by probing a live key. Everything else in the
table is from vendor docs and pricing pages. Absence of a documented feature was
verified by grep; **presence** of a working feed was not verified for any
alternative. Do not commit to a provider on documentation alone — trial and
probe first, exactly as was done for The Odds API.

---

## 3b. Sub-£50/month scan for match-market depth (2026-07-28)

Separate question from outrights: **BTTS and extended markets are thin on The
Odds API** (verified 2026-07-28: Lincoln Red Imps v Mjällby BTTS = 2 UK books,
`eu` region adds nothing for UK bookmakers — see
[specs/estimated-odds-fill.md](./specs/estimated-odds-fill.md)). Scanned the
[Datarade "best sports betting APIs" list](https://datarade.ai/top-lists/best-sports-betting-apis)
plus follow-ups for anything under **£50/month** that fills the gap.

Most of the Datarade list is irrelevant: FantasyData ($599/mo, US sports),
Sportradar/Gracenote (enterprise, sales-only pricing), Esports Charts and
Shikenso (esports analytics, no odds), TheSports (custom pricing, no published
odds depth), GoalServe (custom pricing; historically well over £50/mo).

### Candidates under £50/month

| Provider | ~£/mo | Bookmakers | BTTS | Notes |
|---|---|---|---|---|
| **TheStatsAPI** | **~£39** ($50 Starter, 100k req/mo) | 5: **bet365, Paddy Power, Betfair Sportsbook**, Pinnacle, Kambi | **Yes** (+ 1X2, AH, O/U, DNB, corners) | 150+ competitions; **7-day free trial, no card**. Bet365 + Paddy Power are exactly the books missing from The Odds API |
| **API-Football** (API-SPORTS) | **~£15** ($19 Pro, 7.5k req/day) | ~20 aggregate feed incl. bet365, William Hill, Unibet | Yes (market in odds endpoint) | All endpoints on every tier incl. free; odds refresh cadence and per-fixture depth **unverified** |
| **Sportmonks** | ~£45 (€29 Starter + €24 odds add-on) | 50+ | Yes (150+ markets) | **Starter caps at 5 leagues** — likely disqualifying for qualifier-class fixtures; no outrights (§2) |
| **BetsAPI** (already open decision #3) | ~£8+ (from ~$10/mo) | ~5, full site depth incl. bet365 | Yes | $1 one-day trial; cheapest full-depth option on the table |

### Assessment

- **Yes, under £50/month is achievable.** TheStatsAPI is the best documented
  fit for the specific gap (bet365 + Paddy Power BTTS on low-profile
  fixtures), and its free trial makes probing cheap. BetsAPI remains the
  cheapest full-depth option and its $1 trial is already open decision #3 —
  trial both against the same qualifier-class fixture and compare.
- **None of these replace The Odds API.** They have few or no deeplinks and a
  narrower bookmaker spread; they would slot in as a **depth supplement**
  (per rule: keep the fixture path, add a second source for the gap), the same
  pattern proposed for outrights in §3.
- **Nothing here is live-verified** (rule of thumb 2 — only trials count).
  Specifically unverified: whether TheStatsAPI's "150+ competitions" includes
  CL qualifiers; whether its bet365 prices are licensed or scraped (affects
  reliability and ToS risk); API-Football's odds refresh frequency.

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
| 2 | Corners/cards settlement — needs a stats source + resolver branches, **not** a guard change | **Proposed**: API-Football statistics + new resolver branches ([spec](./specs/odds-and-results-sourcing.md) Phase 2) |
| 3 | Trial BetsAPI ($1/one-day) and probe id-mapping quality | **Superseded** by the spec's Phase 0 bake-off (API-Football as the stats source; id mapping via `Match.externalOddsId` + `TeamAlias`) |
| 4 | Cards: booking-point approximation vs. keep manual | **Open** — decide deliberately, not by default. API-Football card events (incl. second yellows) would support either convention |
| 5 | Extend `MatchResult` beyond `{homeGoals, awayGoals, status}` | **Proposed** in the spec, Phase 2 (`halfTime?`, `stats?`) |
| 6 | Trial TheStatsAPI (7-day free) for BTTS depth (bet365 + Paddy Power) alongside the BetsAPI trial — same qualifier-class fixture, compare | **Folded into** the spec's Phase 0 bake-off, alongside OddsPapi and UK Odds API Starter |
| 7 | Odds + results sourcing under a £100/month cap | **Proposed** — [specs/odds-and-results-sourcing.md](./specs/odds-and-results-sourcing.md) |

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

## 7. September 2026 re-evaluation

**Date:** 2026-09-22 · **Status:** research complete; **live-probed 22–23 Sept**
(see *Probe results* below). The research itself came from vendor docs and web
search, because that session's network egress blocked every vendor host. Phase 0
of the spec is the trial.

The brief changed from "outrights + BTTS depth" to:

- more leagues, markets and bookmakers for odds;
- results for every league;
- **≤ £100/month for odds and results combined**.

Anything was in scope: scraping, AI, search engines.

### Corrections to earlier sections

- **Betfair (§3).** It isn't a free source for us:
  - the delayed key is for development/testing and private betting;
  - commercial use of the data needs Betfair's approval;
  - the software-vendor licence costs £999.
- **The Odds API pricing (§3 table).** The plans are 500 free, 20K $30, 100K $59, 5M $119 and 15M $249 credits/month. There's no "$99 Business tier".
- **UK Odds API (§3 table).** A Starter plan now exists at £49/month (10 UK bookmakers, core markets). Pro is £149 (all 34).

### New findings

| Finding | Consequence |
|---|---|
| **API-Football**. Pricing: Pro $19/month (7,500 requests/day); the free plan serves seasons 2022–2024 only. Coverage: 1,200+ competitions including League One/Two, FA Cup, EFL Cup and UEFA's second and third tiers. Data: 90' score split from extra time, statistics (corners, cards), events (card type incl. second yellow, goals), live scores. Odds from ~15–20 bookmakers incl. bet365, refreshed every 3h | Best-value results source by far; odds depth comes bundled |
| The Odds API has `/scores` (2 credits with `daysFrom` ≤ 3), keyed by the **same event id** our legs store | Zero-fuzz second opinion on results. `Match.externalOddsId` (unused today) is the join |
| football-data.org paid: Standard €49 (25 competitions), Advanced €99 (50); stats are an add-on | Poor value next to API-Football |
| Smarkets API: £150 activation; no redistribution without written approval | Not usable |
| Google Custom Search JSON API: closed to new customers, ends 2027-01-01 | "Google search" for results must go via Gemini grounding (5,000 free prompts/month on Gemini 3.x) or a SERP API |
| **OddsPapi**. Pricing: free tier 250 requests/month, each returning all bookmakers and markets for a fixture; paid "from ~$49". Claims: 350+ bookmakers, 460+ markets, event/market/betslip links via `includeLinks` where available | The only candidate claiming breadth + depth + links under £50. Trial it; vendor-authored claims only |
| TheStatsAPI: $50 Starter; odds from bet365, Paddy Power, Betfair Sportsbook, Pinnacle and Kambi; results + stats; 150 competitions by default | Trial as an alternative depth feed |
| Kambi's public offering API is keyless. It powers Unibet, 32Red, LeoVegas, BetUK, Grosvenor, Casumo and BetMGM UK | Parked: unofficial, one pricing engine behind all 7 brands, ToS risk |
| API-Sports' terms grant no licence to publish its data | Same as today with football-data.org. Revisit if the app scales |

### Conclusion

No single provider covers all of these under £100/month:

- UK bookmakers;
- bet365;
- market depth;
- deeplinks;
- results with stats.

A small portfolio does, for roughly £40–£90/month. The plan in
[specs/odds-and-results-sourcing.md](./specs/odds-and-results-sourcing.md):

- **API-Football** for results, with its odds as the default depth feed.
- **The Odds API**, bulk markets only, for its breadth of UK bookmakers. Betslip deeplinks are low priority (owner decision, 2026-09-22).
- **Consensus settlement** across API-Football, The Odds API `/scores` and football-data.org.
- **An AI resolver** for ties only.
- **A bake-off** that picks at most one extra depth feed.

The spec's §10 lists sources and a confidence level for each claim.

### Probe results (22–23 Sept 2026)

Run locally with `scripts/ops/probe-sources.mjs` plus a one-off Nations League
check. API-Football was on Pro; The Odds API on region `uk`.

**The Odds API**

| Measure | Result |
|---|---|
| Plan and credits | **20K plan** (not 100K as the spec first assumed): 16,655 used, 3,345 left on 22 Sept |
| Soccer keys | 67, 43 active. Active §3.7 candidates: Nations League, Conference League, Ligue 2, Serie B, 2. Bundesliga, La Liga 2, Belgium, Turkey, Greece, Austria, Switzerland, Denmark, Norway, Sweden, MLS, Liga MX, Argentina, Brazil Série B, Copa Sudamericana, K League 1, League of Ireland, Scottish Premiership |
| Inactive or missing | FA Cup, Poland, J League, A-League and Saudi Pro League inactive. No key at all for the National League, WSL, Scottish Championship or international friendlies |
| `/scores` (last 3 days) | EPL 4 of 24 listed events completed; Championship 2 of 14; League Two, Europa League and Nations League 0 |
| UK books, Championship (9–10 Oct, 17 days out) | h2h 13 (incl. the Betfair and Smarkets exchanges), BTTS 5, corners 0, cards 0, anytime scorer 0 |
| UK books, Nations League (24 Sept, 2 days out) | h2h 11 (incl. the Betfair exchange), BTTS 7, corners 1 book on one of two fixtures, cards 0, anytime scorer 0 |

**API-Football (Pro)**

| Measure | Result |
|---|---|
| Quota | 7,500 requests/day; a full probe uses under 20 |
| Bookmakers | 33 listed. UK: Betfair, William Hill, bet365, Ladbrokes, Betfred, Unibet, 888Sport, Betway, BetVictor. **No Sky Bet, Paddy Power or Coral** |
| Premier League odds | bet365 up to 105 bet types per fixture, William Hill 48, Betfair 17, BetVictor 14 |
| Nations League odds | 50 of 156 fixtures priced so far. UK books actually present: **Betfair, bet365, William Hill and BetVictor only**. bet365 has corners over/under and anytime scorer; only one non-UK book prices cards |
| Quote age | Nearest Nations League fixture last updated 11 hours before the probe |
| Coverage flags, current season | Events, stats and odds on the Premier League, Championship, League One, League Two, Carabao Cup, WSL, Scottish Premiership, League of Ireland, Europa League, MLS and international friendlies. **Champions League and Conference League: no odds.** National League, Scottish Championship and club friendlies: no stats. FA Cup: no events or stats |
| Nations League stats | Flags are off for 2026 (not started) but on for every past season. Four sampled 2024–26 finished fixtures all had corners, yellow cards and goal/card events |
| Mapping to The Odds API | Nations League: 37 of 45 events match on exact name and date; the other 8 need 4 aliases (Rep. Of Ireland, Türkiye, Czechia, FYR Macedonia), giving 45 of 45 |

**football-data.org:** 12 competitions on TIER_ONE, as expected, plus Copa Libertadores on TIER_FOUR.

### Could API-Football replace The Odds API outright?

Not yet (spec open decision 11, 2026-09-23). Retiring The Odds API saves $30/month but:

- **Fewer UK bookmakers.** 4 UK sportsbooks on Nations League fixtures against 10, and none of Paddy Power, Coral or Sky Bet. "Best price across UK books" gets worse.
- **No Champions League or Conference League odds** on API-Football, and the Champions League is in the catalogue.
- **Staler prices.** API-Football refreshes every 3h; the sample quote was 11h old.
- **It's a rewrite, not a switch.** The fixture list, `externalOddsId` on legs, lock-time quotes and betslip deeplinks all come from The Odds API today.

API-Football's odds remain the planned **depth** feed (BTTS, double chance, correct score, corners, goalscorer), where The Odds API is thin.

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
- [Datarade — best sports betting APIs](https://datarade.ai/top-lists/best-sports-betting-apis) ·
  [TheStatsAPI odds](https://www.thestatsapi.com/odds-api) ·
  [API-Football pricing](https://www.api-football.com/pricing)
- [SportsGameOdds pricing](https://sportsgameodds.com/pricing/) ·
  [OpticOdds](https://opticodds.com/sports/soccer) ·
  [LSports](https://www.lsports.eu/blog/sports-betting-apis/)

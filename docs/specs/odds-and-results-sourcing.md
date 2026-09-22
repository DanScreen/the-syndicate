# Spec: Odds & results sourcing v2 (multi-source, ≤ £100/month)

| Field | Value |
|-------|-------|
| **Status** | Proposed. Research complete 2026-09-22; **nothing has been live-trialled yet** (Phase 0 is the trial) |
| **Budget** | ≤ £100/month for odds **and** results combined (owner hard cap) |
| **Depends on** | — |
| **Related** | [ODDS_PROVIDERS.md](../ODDS_PROVIDERS.md) (provider research, §7 is the September 2026 re-evaluation), [competitions-and-results.md](./competitions-and-results.md), [live-matchday.md](./live-matchday.md), [estimated-odds-fill.md](./estimated-odds-fill.md), [affiliate-and-betslips.md](./affiliate-and-betslips.md), [season-readiness.md](./season-readiness.md) |

---

## TL;DR

- **Stop looking for one provider.** Nothing under £100/month has everything we need in one feed: UK bookmakers, bet365, deep markets, deeplinks, and results with stats. A small portfolio of providers does, for roughly **£40–£90/month** (§5).
- **Results → API-Football Pro ($19/month)** as the primary feed for every competition. It covers 1,200+ leagues and cups, gives the 90-minute score separately from extra time, corners and cards statistics, card-type and goal events, and live scores. This:
  - removes manual settlement for League One, League Two, the Carabao Cup, the Europa League and CL qualifiers;
  - unblocks the FA Cup;
  - makes the corners & cards tier we already sell auto-settleable;
  - answers live-matchday's open question about live scores.
- **Cross-check results instead of trusting one feed.** Store each provider's result as an *observation* and settle from consensus between three sources:
  - API-Football;
  - The Odds API `/scores`, which is keyed by the same event id our legs already store, so no team-name matching is needed;
  - football-data.org free (12 competitions).

  An **AI resolver** (Claude with web search) only breaks ties or fills silence. It never settles on its own.
- **Odds → keep The Odds API for UK retail prices and deeplinks, and add a depth feed.**
  - API-Football's odds come in the same subscription at no extra cost: bet365, William Hill and others, 100+ bet types, refreshed every 3 hours.
  - In parallel, trial the three sub-£50 feeds that claim UK depth (OddsPapi, UK Odds API Starter, TheStatsAPI) and adopt **at most one**.
- **Moving extended markets off The Odds API cuts its credit burn by ~85%** in a peak-season, 20-competition scenario (§5.1). The plan can then drop from 100K ($59) to 20K ($30), which pays for the new sources.
- **Not recommended:**
  - scraping bookmakers or Oddschecker;
  - the Betfair and Smarkets exchange APIs, which aren't licensed for commercial display (this **corrects** ODDS_PROVIDERS §3);
  - ESPN, FotMob and SofaScore hidden APIs;
  - Google Custom Search, which is closed to new customers and shuts on 2027-01-01.

  Full list in §4.

---

## 1. Problem (as-built, September 2026)

### Results

| Gap | Evidence |
|-----|----------|
| 5 catalogue competitions never auto-settle | `manualSettlement: true` on `league-one`, `league-two`, `champions-league-qual`, `europa-league`, `efl-cup` (`packages/shared/src/competitions.ts`). The football-data.org free tier has none of them |
| FA Cup can't be added | [season-readiness.md](./season-readiness.md): `FAC` isn't on the free tier either |
| Corners & cards are sold but never auto-settle | `MatchResult` is only `{homeGoals, awayGoals, status}`. `resolveLegOutcome()` returns `null`, so every such leg falls into the admin queue ([ODDS_PROVIDERS §4](../ODDS_PROVIDERS.md#4-results-coverage-the-settlement-gap)) |
| No live scores | The football-data free tier delays scores. This is an open question in [live-matchday.md](./live-matchday.md) |
| Fragile leg ↔ match join | Legs are matched to matches by competition, UTC kickoff day, a substring team-name match and 3 hard-coded aliases (`lib/results/football-data.ts`, `lib/results/match-store.ts`). `Match.externalOddsId` exists (unique) but is **never written** |
| One feed, no second opinion | A wrong feed score is caught only by the 1h stability window, the 24h reconcile, or an admin |

### Odds

| Gap | Evidence |
|-----|----------|
| No bet365 | Not in The Odds API's `uk` region. It's the largest UK bookmaker |
| Thin extended markets on lower-profile fixtures | Lincoln Red Imps v Mjällby BTTS was priced by 2 UK bookmakers (verified live 2026-07-28). That's why [estimated-odds fill](./estimated-odds-fill.md) exists |
| Popular UK acca markets missing | No goalscorers from UK bookmakers (The Odds API's soccer player props are US-books only). No half-time result, HT/FT, team goals, win to nil, or result + BTTS |
| Depth cost scales per fixture | Core tier costs 5 credits per fixture per warm run, specials 7. A 20-competition peak weekend needs ~97K credits/month on today's design (§5.1) |

## 2. Requirements

| # | Requirement |
|---|-------------|
| R1 | Total spend on odds + results ≤ **£100/month**. Plan for ≤ ~£80 so VAT and FX swings don't break the cap |
| R2 | Auto-settle **every** competition we offer, including every market we sell. A market we can't settle isn't offered in that competition |
| R3 | More bookmakers (bet365 at minimum) and more markets in the picker, **UK-licensed bookmakers only** anywhere a user sees or locks a price |
| R4 | Keep real betslip deeplinks wherever a source provides them. Hub links stay a labelled last resort (current behaviour) |
| R5 | More leagues, added by config: a catalogue entry plus an admin toggle |
| R6 | No new manual toil. The admin queue stays the escape hatch, not the workflow |
| R7 | Follow the [ODDS_PROVIDERS rules of thumb](../ODDS_PROVIDERS.md#6-rules-of-thumb): trial before committing, negative-cache failures, don't trust vendor marketing |

---

## 3. Target architecture

### 3.1 Results: observations → consensus → canonical `Match`

```mermaid
flowchart LR
  AF["API-Football<br/>fixtures?ids= (≤20/call)"] --> OBS[(MatchObservation)]
  OA["The Odds API /scores<br/>same event id as Leg.fixtureId"] --> OBS
  FD["football-data.org free<br/>12 comps"] --> OBS
  AI["AI resolver<br/>tie-break / silence only"] -.-> OBS
  OBS --> C{consensus}
  C -->|"agree, or single trusted source"| M[("Match (canonical)")]
  C -->|"disagree / silent past cap"| Q["AI resolver → admin queue"]
  ADM[Admin override] --> M
  M --> R["resolveLegOutcome() + stats resolvers"]
```

`Match` stays the one row that settlement reads, so the existing FT stability clock, `scoreLocked`, the 24h reconcile and the exactly-once settle keep working unchanged. What changes is **how `Match` gets written**: from a consensus of per-provider observations instead of a single feed.

**Consensus rules for goal-based markets** (90-minute score):

1. **Admin lock wins** (unchanged).
2. **Two-source agreement (C2).** At least 2 observations agree on terminal status and 90' score, and none disagree. Timing is unchanged: the FT score must be stable for 1h, capped at 4h. A faster confirmation for agreed results is open decision 5.
3. **Single source (C1).** Only one provider covers the match: today's rule applies (stable 1h, 4h cap). This is the rule every match uses today, because today there's only one feed.
4. **Disagreement.** Hold. If it's still unresolved at the 4h cap, run the AI resolver (§3.5):
   - If its answer matches one side **and** cites ≥2 independent publishers, that side wins.
   - Otherwise the match goes to the admin queue with every observation and the AI evidence shown side by side.
5. **Silence.** No terminal observation by KO + 4h: run the AI resolver.
   - If a structured provider later corroborates its answer, accept it.
   - Otherwise it appears as a one-click suggestion in the admin queue.
6. **Extra time.** When any provider reports AET or penalties, only providers that expose the regulation-time split may vote on the 90' score: API-Football `score.fulltime` and football-data `regularTime`. The Odds API `/scores` doesn't document ET handling, so it abstains.
7. **Reconcile (unchanged).** Consensus changes inside `RESULT_RECONCILE_MS` (24h) re-run `reconcileMatchLegOutcomes()`.

**Stats-based markets** (corners, cards, goalscorers). API-Football is the only stats source, so these are always single-source:

- **Settle** when the match is FINISHED in regulation and the stats are unchanged for `STATS_CONFIRMATION_MS` (proposed 2h). Stats get revised after the match more often than scores.
- **Extra time:** corners and cards legs go to the admin queue, because stats aren't split by period.
- **No coverage:** where API-Football lacks `statistics_fixtures` coverage for a league, **don't offer the corners & cards tier** in that competition (R2).

### 3.2 Link legs to matches by id, not by team name

- **At leg create or edit:** upsert a `Match` by `externalOddsId = leg.fixtureId` (the Odds API event id is already the fixture id) and set `leg.matchId` immediately. The Odds API `/scores` then joins with zero fuzz.
  - Outright legs are excluded (no match behind them).
  - `af:`-prefixed fixtures (§3.4) key on their API-Football id instead.
- **Every other provider maps its fixture onto that `Match` once** and stores its external id on its observation row. The rule: same competition, kickoff within ±3h, and both team names equal after normalisation plus a `TeamAlias` lookup.
- **Auto-learn aliases safely.** When exactly one fixture exists in that competition and time window, and one side matches, record the other side as an alias pair (`source: auto`). Anything ambiguous becomes an admin mapping suggestion. An LLM may *propose* the alias; it's never auto-applied.
- **Refactor the football-data sync from create-by-`externalDataId` to map-then-attach**, so one fixture never produces two `Match` rows.
- **Keep `findDbMatchForLeg()`'s fuzzy path** only as a fallback for legacy legs.

### 3.3 Settle what we sell (and unlock new markets)

| Market (canonical `marketType`) | Offered today? | Settles from | Rule / caveat |
|---|---|---|---|
| `match_winner`, `double_chance`, `draw_no_bet`, `both_teams_score`, `correct_score`, `over_under_*`, `asian_handicap_*` | Yes | 90' score (consensus) | Unchanged resolvers |
| `corners_1x2`, `corners_over_under_*`, `corners_handicap_*`, `team_corners__*` | Yes (specials) | API-Football `statistics` "Corner Kicks" | Regulation-only matches. ET goes to the admin queue. The `over_under_` guard in `resolve-leg.ts` stays; corners get their **own** branch |
| `cards_over_under_*`, `cards_handicap_*` | Yes (specials) | API-Football `events` (card type includes "second yellow") | Booking-point vs card-count rules differ by bookmaker. **Manual until [ODDS_PROVIDERS decision #4](../ODDS_PROVIDERS.md#5-open-decisions) is made**; the data to compute either convention is now available |
| `to_qualify` | Yes (specials) | API-Football winner after ET/pens | Needs the final (not 90') result, so it's the exception to rule 6 |
| `ht_result`, `ht_ft` | No (new) | `score.halftime` + 90' | Phase 3 |
| Team goals over/under, `win_to_nil`, `clean_sheet`, result + BTTS | No (new) | 90' score | Phase 3 |
| Anytime / first goalscorer | No (new) | API-Football `events` + `lineups` | Void when the player didn't take part. Needs player-name mapping to the odds source. Phase 3b |

`MatchResult` gains optional `halfTime` and `stats` fields. Each new resolver branch returns `null` when its data is missing, so a missing field routes to the admin queue rather than settling on the wrong statistic. Same principle as the load-bearing `over_under_` guard.

### 3.4 Odds: one market taxonomy, several sources

The existing seams already fit a multi-source design:

- mappers produce `Market[]` in our canonical taxonomy (`marketType` + `selectionId`);
- snapshots live in `OddsBulkSnapshot` and `OddsEventSnapshot`;
- `mergeMarketCollections()` already merges quotes **per bookmaker** and keeps whichever side has the deeplink.

Changes:

1. **`OddsSource` adapter interface** with `listFixtures(competition)` and `fetchMarkets(fixture, tier)`, returning canonical `Market[]`.
   - Move The Odds API code behind it first, with no behaviour change.
   - Then add `apiFootballOdds`, and one trial adapter per bake-off candidate behind a flag.
2. **Bookmaker identity.** Canonical keys stay The Odds API's (`williamhill`, `sport888`, `ladbrokes_uk`, …). Each adapter maps its bookmaker names to those keys, e.g. API-Football "Bet365" → `bet365`. **Unmapped bookmakers are dropped.**
3. **UK-licence allowlist** (`UK_LICENSED_BOOKMAKER_IDS`, `packages/shared/src/bookmakers.ts`), applied alongside the existing exchange filter. API-Football and OddsPapi carry many non-UK books (1xBet, Pinnacle, SBO, …), and those must never reach a user or a locked price.
4. **Quote provenance.** Add optional `source` and `fetchedAt` to `BookmakerQuote`. Old snapshots stay valid.
5. **Freshness-aware merge.** Today `mergeQuotes()` keeps the *higher* price for a bookmaker, which could prefer a 3-hour-old quote over a fresh one.
   - New rule: when two sources' `fetchedAt` differ by more than 30 min, the fresher quote wins.
   - Otherwise keep today's better-price rule.
   - Always keep a real deeplink for that bookmaker and selection.
6. **Fixture identity.** The Odds API event id stays the fixture id wherever The Odds API covers the competition, for deeplinks and `/scores`. Other sources attach through the §3.2 mapping. For competitions The Odds API doesn't cover, use the API-Football fixture id with an `af:` prefix, like outright ids.
7. **Offer only what we can settle.** Every new market type ships with its resolver, `tierForMarketType()` and `marketGroupId()` entries, and unit tests in the same PR (R2).

**Which source serves which market (target):**

| Market family | Source(s) | Why |
|---|---|---|
| 1X2, goal totals, Asian handicap (featured) | The Odds API bulk (UK books + deeplinks) **merged with** the depth feed (bet365 + extra books) | Breadth *and* links |
| BTTS, double chance, correct score, alt lines, DNB | Depth feed. The Odds API core tier kept only for deeplink-priority fixtures (e.g. EPL/UCL within 24h) | This is where The Odds API's UK books are thin, and it's what burns credits |
| Half-time, HT/FT, team goals, win to nil, combos | Depth feed | Not in The Odds API's UK feed today |
| Corners & cards | Depth feed + The Odds API specials on demand | Now settleable (§3.3) |
| Goalscorers | Depth feed | UK bookmakers absent from The Odds API's soccer props |

"Depth feed" means API-Football odds by default, or the bake-off winner if one is adopted (§6, Phase 0).

### 3.5 AI resolver (tie-break and long tail only)

**Why AI is used for results but not prices.** A final score is a stable, public, checkable fact that is reported by many independent publishers, so it can be corroborated. A price is volatile and must be exact. An LLM reading bookmaker pages would still be scraping, and it can misread numbers.

- **Trigger:** consensus rule 4 or 5 (§3.1).
  - At most one run per match.
  - Capped by `AI_RESOLVER_MAX_PER_DAY`.
  - Behind the `AI_RESOLVER_ENABLED` flag, default off.
- **Call:** Claude Messages API with the server-side `web_search` tool.
  - Model: `claude-opus-5`, the current default. A cheaper model is an option only after the offline eval shows it holds accuracy.
  - `max_uses` ≈ 5.
  - `allowed_domains` restricted to a curated list of results publishers: BBC Sport, Sky Sports, ESPN, the Guardian, the competition's official site, club sites.
  - The verdict comes back through a **strict client tool** (`record_result`, `strict: true`) carrying: status, 90' goals, after-ET goals, qualifier, and 2+ `{url, publisher, excerpt}` sources.
- **Output is a *match fact*, never a leg outcome.** It's written as a `MatchObservation` (`provider: ai_resolver`, evidence stored). Leg outcomes stay deterministic in `resolve-leg.ts`.
- **Acceptance.** Automatic only when the answer corroborates a structured provider **and** cites ≥2 independent publishers. Otherwise it's a suggestion with evidence links and a one-click "Accept" in `/admin/settlement`.
- **Cost.** About $0.10–0.30 per lookup on current Claude pricing ($5/$25 per MTok for Opus 5, plus $10 per 1,000 web searches). Expected volume at today's scale is a handful per month, so < $5. A cap of 50/month bounds it at ~$15.
- **Alternatives if volume grows:**
  - Gemini with Google Search grounding: 5,000 free grounded prompts/month on Gemini 3.x, then $14 per 1,000.
  - A SERP API reading Google's sports result card: SerpApi 250 free searches/month; Serper 2,500 free credits, then ~$1 per 1,000. These scrape Google, and the ToS grey area sits with the vendor.

### 3.6 League expansion

- **Catalogue additions** in `packages/shared/src/competitions.ts`:
  - `apiFootballLeagueId?: number` for results, stats and optional odds;
  - `fixtureSource?: "odds_api" | "api_football"`, defaulting to `odds_api` when `oddsApiSport` is set.
- **`manualSettlement`** remains only for outrights and for competitions with no results provider.
- **Adding a league** means a catalogue row plus the admin toggle:
  - Results auto-settle via API-Football.
  - Odds come from The Odds API when it has a sport key. Verify the key with `/v4/sports?all=true` first ([rule #1](../ODDS_PROVIDERS.md#6-rules-of-thumb)).
  - Otherwise odds are API-Football-only: no deeplinks, labelled hub link.
- **First candidates** (all on API-Football): FA Cup (Odds API key `soccer_fa_cup`, already in the backlog), Europa Conference League, Scottish Premiership, second tiers (Ligue 2, Serie B, 2. Bundesliga, La Liga 2), MLS for the summer gap.
- **Per-competition health on `/admin/odds`:** % of fixtures mapped across providers, median UK bookmakers per market family, % results confirmed by C2 vs C1 vs admin.

---

## 4. Options assessed (including the out-of-the-box ones)

| Idea | Verdict | Why |
|---|---|---|
| **API-Football** (results + stats + odds) | **Adopt** | $19/month (Pro, 7,500 requests/day). 1,200+ competitions. 90' split, statistics, events, live scores. Odds from ~15–20 bookmakers incl. bet365, 3-hourly. The free plan only serves seasons 2022–2024, so trials need the paid month |
| **The Odds API** (current) | **Keep, right-size** | The only verified deeplink source, and broad UK bookmakers. `/scores` gives id-keyed results for 2 credits a call (with `daysFrom`) |
| **football-data.org free** | **Keep as second opinion** | 12 competitions, £0. Upgrading is poor value: Standard €49/month buys 25 competitions, and stats are a paid add-on on top |
| OddsPapi | **Trial (Phase 0)** | Claims 350+ bookmakers and 460+ markets, with `includeLinks` returning event, market and betslip links where available. Free tier 250 requests/month; paid "from ~$49". Unverified and a newer vendor |
| UK Odds API | **Trial Starter (Phase 0)** | Purpose-built for UK. Starter £49/month for 10 UK bookmakers (core markets). Pro £149 for all 34 is over budget |
| TheStatsAPI | **Trial (Phase 0)** | $50/month Starter (100K requests). Odds from bet365, Paddy Power, Betfair Sportsbook, Pinnacle and Kambi, plus results and stats. 150 competitions by default. 7-day free trial |
| odds-api.io | No | Bookmaker count is tier-gated: £49 buys 2 books, £99 5, £229 15 |
| SharpAPI | No | $79/month for 5 sportsbooks |
| The Odds API 5M plan ($119) for everything | No | Eats ~£89 of the £100 and still has no bet365 and still thin UK extended markets |
| **Affiliate programme feeds** | **Pursue in parallel** | Licensed and free, and they come with tracked deeplinks. Already [roadmap #5](../ROADMAP.md). Several UK programmes have historically offered XML odds feeds (William Hill's price feeds are the best-known), but availability must be confirmed per programme during onboarding |
| Scrape bookmaker sites (bet365, Sky Bet, Paddy Power) | **No** | Breaches ToS. Anti-bot measures (bet365 especially). Residential-proxy cost, brittle. Scraping the operators whose affiliate programmes we're applying to (roadmap #5) risks those relationships |
| Kambi's public offering API (Unibet, 32Red, LeoVegas, BetUK, Grosvenor, Casumo, BetMGM UK) | Parked | Keyless JSON with deep markets. But it's unofficial, one pricing engine sits behind 7 brands (little price diversity), and several of those brands are already in The Odds API. Revisit only with legal comfort, as a flag-gated experiment |
| Scrape Oddschecker / OddsPortal | **No** | A compiled odds table is exactly what the UK *sui generis* database right and site ToS protect. Also behind Cloudflare |
| Betfair Exchange API | **No, correcting ODDS_PROVIDERS §3** | The free *delayed* key is for development/testing and personal betting. Commercial use needs Betfair's approval, and the software-vendor licence costs £999. Exchange prices aren't retail anyway |
| Smarkets API | No | £150 activation fee, and prices may not be redistributed without written approval |
| ESPN / FotMob / SofaScore hidden APIs | No (production) | Undocumented, commercial use not permitted, can vanish. Fine for a human spot check |
| Google Custom Search JSON API | Not available | Closed to new customers. Shuts down 2027-01-01 |
| Google via Gemini grounding / SERP APIs | Alternative AI back-end | See §3.5 |
| LLM reads odds | No | Prices must be exact and fresh; this is scraping with extra error |
| Group members confirm results | Parked | Incentive conflict: members would be settling their own bets. Possible later as an extra admin signal, never a decider |

## 5. Budget

Currency: GBP/USD 1.336 on 2026-09-22, so $1 ≈ £0.75. Prices are ex-VAT. If a vendor charges UK VAT that can't be reclaimed, add 20%. That is why §2 plans to ~£80.

### 5.1 The Odds API credits: today vs after Phase 3

Scenario: peak-season weekend, 20 enabled competitions, 150 fixtures inside the 72h core-warm window, 4 warm runs a day.

| Usage | Today's design | After Phase 3 |
|---|---|---|
| Bulk (3 credits per competition per run) | 3 × 20 × 4 × 30 = 7,200 | 7,200 |
| Core tier (5 credits per fixture per run) | 5 × 150 × 4 × 30 = 90,000 | Deeplink-priority fixtures only (~10/day × 5 × 2 runs) ≈ 3,000 |
| Specials on demand (7 credits) | Occasional | ~350 |
| `/scores` (2 credits, only competitions with pending legs, KO+100m…KO+4h) | — | ~1,000–5,000 |
| **Total / month** | **~97,000 → needs 100K ($59), no headroom** | **~12,000–16,000 → fits 20K ($30)** |

### 5.2 Monthly cost by stage

| Line | Phases 1–2 (results fixed) | Target A (API-Football odds as the depth feed) | Target B (+ one bake-off feed) |
|---|---|---|---|
| The Odds API | 100K $59 | 20K $30 | 20K $30 |
| API-Football | Pro $19 | Pro $19 | Pro $19 |
| Bake-off feed | — | — | ~$49–65 (OddsPapi ~$49 unverified; UK Odds API £49 ≈ $65; TheStatsAPI $50) |
| AI resolver | ≤ $5 | ≤ $5 | ≤ $5 |
| football-data.org | $0 | $0 | $0 |
| **Total** | **~$83 ≈ £62** | **~$54 ≈ £41** | **~$103–119 ≈ £77–89** |

- **Incremental cost of Phases 1–2** over today is **$19 + AI ≈ £15–18**, if you're already on the 100K plan.
- **Target B with UK Odds API Starter** sits close to the cap once VAT is added. Choose it only if VAT is reclaimable or its bookmaker list clearly beats the others.
- **API-Football Ultra ($29, 75K requests/day)** is only needed if live polling moves to every minute or the catalogue grows a lot. The §6 request budget shows Pro is ample.

---

## 6. Rollout (each phase ships independently)

### Phase 0: bake-off (1–2 weeks, ≈ £15 plus free tiers)

Rule of thumb #2: only trials count. Nothing below has been probed live, because this research session's network egress blocked every vendor host.

- [ ] Buy one month of API-Football Pro. The free plan can't see the current season.
- [ ] Free keys and trials:
  - OddsPapi (250 requests/month);
  - TheStatsAPI (7 days);
  - UK Odds API Starter (ask for a trial and confirm **which** 10 bookmakers).
- [ ] Fixed probe set, used for every source: 1 EPL, 1 Championship, 1 League Two, 1 Europa or Conference League, 1 Eredivisie, and 1 cup tie that goes to **extra time**. Include both upcoming fixtures (odds) and finished ones (results).
- [ ] Dev-only script `scripts/probe-sources.ts` that writes a markdown report for each source × fixture:
  - **Odds:** UK-licensed bookmakers per market family, whether bet365 is present, deeplink presence, quote age, market count.
  - **Results:** latency from FT to a terminal observation, 90' vs AET correctness, corners/cards presence for League Two, card-event detail types, and automatic mapping rate against The Odds API event ids.
- [ ] Check The Odds API `/scores` coverage for each enabled sport key and its extra-time behaviour.
- [ ] Record the numbers (not impressions) in [ODDS_PROVIDERS §7](../ODDS_PROVIDERS.md#7-september-2026-re-evaluation) and decide open decision 1.
- **Exit criteria:**
  - ≥ 98% of The Odds API events in enabled competitions map to API-Football automatically;
  - ≥ 95% of probe results are terminal within 15 min of FT;
  - League Two has fixture statistics.

### Phase 1: results v2 (removes manual settlement)

- [ ] Migration: `MatchObservation`, `TeamAlias` (§7)
- [ ] Leg create/edit upserts `Match` by `externalOddsId = fixtureId` and sets `leg.matchId` (§3.2)
- [ ] `apiFootballLeagueId` on the catalogue
- [ ] `lib/results/providers/api-football.ts`:
  - `fixtures?ids=` polling (≤ 20 ids per call) for tracked matches between KO and KO+4h;
  - a daily fixture-list refresh per enabled competition;
  - a quota snapshot from `x-ratelimit-*` headers, plus negative caching (rule #4).
- [ ] Refactor the football-data sync to map-then-attach observations
- [ ] The Odds API `/scores` adapter (competitions with pending legs only)
- [ ] `resolveMatchConsensus()` writes the canonical `Match`. Stability, `scoreLocked` and reconcile are untouched
- [ ] Remove `manualSettlement` from `league-one`, `league-two`, `champions-league-qual`, `europa-league`, `efl-cup`; add `fa-cup`
- [ ] `/admin/results`: a per-match observation table (provider, status, 90', after ET, updated)
- [ ] Tests:
  - consensus: agree / single / disagree / ET abstention / admin lock;
  - alias auto-learning, including the ambiguous case → suggestion;
  - id-first linking.
- [ ] Docs, in the same PR: CURRENT_STATE (sync, env, limitations), DEPLOYMENT (new secret), [competitions-and-results.md](./competitions-and-results.md), `.env.example`

**Request budget, busy Saturday:**

| Call | Requests |
|---|---|
| Tracked-match polling: 60 tracked matches → 3 calls × 12 per hour × ~10h | ≈ 360 |
| Fixture-list refresh | 20 |
| Odds, Phase 3: 20 competitions × ~2 pages × 8 runs | ≈ 320 |
| **Total** | **< 1,000/day**, against 7,500 on Pro |

### Phase 2: settle what we already sell

- [ ] `MatchResult` gains `halfTime?` and `stats?`
- [ ] Resolver branches: corners (regulation only), `to_qualify` (result after ET/pens), HT result. Each returns `null` when data is missing
- [ ] Cards follow decision #4; they stay manual until it's made
- [ ] Hide the specials tier where API-Football coverage lacks fixture statistics
- [ ] Live-matchday: in-play score and minute from API-Football observations. This answers [live-matchday.md](./live-matchday.md)'s open question about free-tier live scores

### Phase 3: odds depth

- [ ] `OddsSource` interface; move The Odds API behind it (no behaviour change, existing tests green)
- [ ] `apiFootballOdds` adapter: bookmaker key map, UK allowlist, canonical market mapping
  - The mapping of the ~100+ API-Football bet types can be LLM-drafted but must be human-reviewed and committed as a table.
- [ ] `source` and `fetchedAt` on quotes; freshness-aware `mergeQuotes()` with unit tests
- [ ] New markets, each with resolver and tests: HT result, HT/FT, team goals, win to nil / clean sheet, result + BTTS
- [ ] **Phase 3b:** anytime / first goalscorer (player mapping + lineups + void rule)
- [ ] Re-tier The Odds API as in §5.1. After one month of metered usage fits, downgrade to 20K
- [ ] Measure the share of displayed quotes that are `estimated` before and after. Real coverage is the honest fix for the thin tables that [estimated-odds fill](./estimated-odds-fill.md) papers over

### Phase 4: AI resolver

- [ ] `lib/results/ai-resolver.ts` per §3.5, flag-gated with a daily cap. New env: `ANTHROPIC_API_KEY`, `AI_RESOLVER_ENABLED`, `AI_RESOLVER_MAX_PER_DAY`
- [ ] `/admin/settlement`: an "Accept AI result" one-click that shows the evidence links
- [ ] **Offline eval before any auto-accept:** replay ≥ 50 finished matches, including known disagreements and AET ties. The bar is ≥ 99% on 90' score and 100% on status

### Phase 5: premium depth feed and affiliate feeds

- [ ] Only if Phase 0 picked a bake-off feed: build its adapter, then drop the API-Football odds adapter if it's fully superseded
- [ ] Ingest odds feeds from affiliate programmes as they're approved (tracked links via [affiliate-and-betslips.md](./affiliate-and-betslips.md))

---

## 7. Data model (sketch)

```prisma
/// One provider's view of a match. `Match` stays canonical; consensus writes it.
model MatchObservation {
  id           String   @id @default(cuid())
  matchId      String
  provider     String   // api_football | odds_api_scores | football_data | ai_resolver
  externalId   String?  // provider fixture/event id (null for ai_resolver)
  status       String   // SCHEDULED | IN_PLAY | FINISHED | AET | PEN | POSTPONED | CANCELLED | ABANDONED | AWARDED
  homeGoals90  Int?
  awayGoals90  Int?
  homeGoalsEnd Int?     // after extra time, excluding shoot-out
  awayGoalsEnd Int?
  homeGoalsHt  Int?
  awayGoalsHt  Int?
  winner       String?  // home | away (knockout progression)
  stats        Json?    // corners, yellows, reds, second yellows, goal events
  evidence     Json?    // ai_resolver: [{ url, publisher, excerpt }]
  observedAt   DateTime @default(now())
  changedAt    DateTime @default(now()) // last change to any settled field
  match        Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)

  @@unique([matchId, provider])
  @@unique([provider, externalId])
}

/// Team-name equivalences across providers (normalised names).
model TeamAlias {
  id            String   @id @default(cuid())
  competitionId String?
  alias         String
  canonical     String   // as The Odds API spells it
  source        String   // auto | admin | ai_suggested
  createdAt     DateTime @default(now())

  @@unique([alias, canonical])
}
```

Catalogue fields: `apiFootballLeagueId?`, `fixtureSource?` (§3.6). Quote fields: `source?`, `fetchedAt?` (§3.4). Neither needs a data migration.

## 8. Risks

| Risk | Mitigation |
|---|---|
| **Aggregator data licensing.** API-Sports says it grants no licence to publish its data | Same position as today with football-data.org. We use results to settle, not to republish feeds. Revisit official data licensing (e.g. Football DataCo for English football) if the app scales |
| A provider changes, degrades or disappears | Adapters plus consensus mean any single provider can drop out. The admin queue remains the escape hatch |
| API-Football odds are up to 3h old | Freshness-aware merge. Lock already reads DB snapshots, and today's warm cadence is 6h, so this is no worse |
| Bookmaker identity collisions across sources | Canonical keys, the allowlist and unit tests. Unknown names are dropped, never guessed |
| Card-market rules differ by bookmaker | Manual until decision #4 |
| ET and penalties semantics | Rule 6: only providers exposing the regulation split vote. `to_qualify` uses the final result |
| AI hallucination | Corroboration rule, evidence stored, never the sole basis, offline eval gate |
| Cost overrun | Per-provider daily caps and quota snapshots. Extend the existing Odds API quota display on `/admin/odds` to every provider |
| A bookmaker with no deeplink (e.g. bet365 via API-Football) tops the acca ranking | Existing labelled hub fallback. Open decision 6 |

## 9. Open decisions

| # | Decision | Default until decided |
|---|---|---|
| 1 | Depth feed: API-Football odds only, or add OddsPapi / UK Odds API Starter / TheStatsAPI | API-Football odds only |
| 2 | The Odds API plan after Phase 3 | Current plan until a month of metered usage fits 20K |
| 3 | Cards settlement convention ([ODDS_PROVIDERS #4](../ODDS_PROVIDERS.md#5-open-decisions)) | Manual |
| 4 | Offer goalscorer markets (Phase 3b) | Not before Phase 3 ships |
| 5 | Faster confirmation when two sources agree (e.g. 20 min instead of 1h) | Off; decide after a month of observation data |
| 6 | Can a bookmaker without deeplinks be the recommended acca bookmaker? | Yes, with the existing hub labelling |
| 7 | AI resolver: auto-accept, or suggest-only | Suggest-only until the eval passes |
| 8 | Kambi public-API experiment | No |

## 10. Verification status and sources

Nothing in this spec was probed live. The research session's network egress blocked every vendor host, so all claims below come from web search and must be confirmed in Phase 0.

| Claim | Confidence |
|---|---|
| The Odds API plans: 500 free / 20K $30 / 100K $59 / 5M $119 / 15M $249; `/scores` 2 credits with `daysFrom` (≤ 3 days) | High (multiple sources agree) |
| The Odds API `uk` region has no bet365 (it does have Paddy Power, Sky Bet, Virgin Bet, LiveScore Bet, …) | High |
| API-Football: Pro $19 (7.5K/day), Ultra $29, Mega $39; free plan limited to seasons 2022–2024 | High |
| API-Football odds: 1–14 days pre-match, refreshed every 3h, 7-day retention; bookmaker list | Medium: bookmaker list and UK coverage **unverified** |
| API-Football `score.fulltime` is the 90' score; `fixtures?ids=` returns up to 20 fixtures with events | Medium: confirm on an AET fixture |
| football-data.org: Standard €49 (25 comps), Advanced €99 (50); free tier has no stats | High |
| OddsPapi coverage, links and paid pricing | Low: vendor-authored sources only |
| Betfair: delayed key is for development and personal betting; commercial use needs approval; vendor licence £999 | High (Betfair support pages) |
| Google Custom Search closed to new customers, ends 2027-01-01 | High (Google docs) |
| Claude: Opus 5 $5/$25 per MTok; web search $10 per 1,000 | High (Anthropic pricing, cached 2026-06) |

**Sources:**

- The Odds API: [home and pricing](https://the-odds-api.com/), [v4 docs](https://the-odds-api.com/liveapi/guides/v4/), [bookmakers](https://the-odds-api.com/sports-odds-data/bookmaker-apis.html)
- API-Football: [pricing](https://www.api-football.com/pricing), [getting-started guide](https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide), [coverage](https://www.api-football.com/coverage), [API-Sports terms](https://api-sports.io/terms)
- football-data.org: [pricing](https://www.football-data.org/pricing), [free-tier limits](https://www.thestatsapi.com/blog/football-data-org-free-tier-limits-2026)
- OddsPapi: [docs](https://oddspapi.io/en/docs), [pricing](https://oddspapi.io/us/pricing), [free tier](https://oddspapi.io/blog/free-odds-api-350-bookmakers/)
- UK Odds API: [site](https://ukoddsapi.com/), [comparison](https://ukoddsapi.com/blog/ukoddsapi-vs-competitors)
- TheStatsAPI: [site](https://www.thestatsapi.com/), [vs API-Football](https://www.thestatsapi.com/blog/thestatsapi-vs-api-football)
- Other odds APIs: [odds-api.io docs](https://docs.odds-api.io/), [SharpAPI pricing](https://sharpapi.io/pricing)
- Betfair: [costs](https://support.developer.betfair.com/hc/en-us/articles/115003864531-Are-there-any-costs-associated-with-API-access), [software vendors](https://support.developer.betfair.com/hc/en-us/articles/360002190732-Do-Software-Vendors-have-to-pay-to-access-the-Betfair-API), [application keys](https://betfair-developer-docs.atlassian.net/wiki/spaces/1smk3cen4v3lu3yomq5qye0ni/pages/2687105/Application+Keys)
- Smarkets: [API T&Cs](https://help.smarkets.com/hc/en-gb/articles/34697834941085-Smarkets-API-Access-Integration-T-Cs)
- Kambi: [UK brands](https://mybettingsites.com/articles/kambi-betting-sites), [public offering API](https://github.com/pdmuinck/kambi-sports-book)
- ESPN: [hidden API status](https://github.com/pseudo-r/Public-ESPN-API)
- Google: [Custom Search JSON API](https://developers.google.com/custom-search/v1/overview), [Gemini pricing and grounding](https://ai.google.dev/gemini-api/docs/pricing)
- SERP APIs: [SerpApi sports results](https://serpapi.com/sports-results), [Serper](https://serper.dev/)
- UK scraping law: [Bird & Bird on scraping](https://www.twobirds.com/en/insights/2021/global/legal-weapons-in-the-fight-against-data-scraping), [Pinsent Masons on Ryanair](https://www.pinsentmasons.com/out-law/news/website-operators-can-prohibit-screen-scraping-of-unprotected-data-via-terms-and-conditions-says-eu-court-in-ryanair-case)
- FX: [GBP/USD](https://tradingeconomics.com/united-kingdom/currency)

# Estimated odds fill (median-backfill for missing bookmaker quotes)

**Status:** shipped, then re-scoped · **Date:** 2026-07-28

> ⚠️ **2026-07-28 re-scope (owner decision).** The original design below treated
> estimates as display-only, haircut, labelled, and excluded from every money
> path. The product owner has since chosen the opposite, with the trade-offs
> laid out and accepted:
>
> - **True median, no haircut** — `ESTIMATED_ODDS_MARGIN` defaults to **0**
>   (an estimate equals the median of real quotes).
> - **Fills from a single real quote** — `ESTIMATED_ODDS_MIN_REAL_QUOTES`
>   defaults to **1** (one real price is copied to every other fixture-covering
>   bookmaker).
> - **Estimates participate in the money path** — `sortQuotesByBestOdds` now
>   *includes* estimates (a real quote still wins ties), so the acca-level
>   bookmaker ranking, round lock and settlement can use an estimated price. A
>   group can therefore lock/settle at a combined price no single bookmaker
>   published.
> - **No label anywhere** — the per-row "est." badge and muted styling are
>   removed; estimated prices render identically to real ones.
>
> The sections below are retained as the original rationale; where they say
> "display-only", "haircut", "excluded from money paths", or "mandatory badge",
> read them against this note. Known trade-offs: estimates are fabricated prices
> shown under real, licensed UK bookmaker names with no disclosure (trust / UK
> ad-standards exposure), and a bet can settle against a price a bookmaker never
> offered.

## Problem

On low-profile fixtures (e.g. Champions League qualifiers), most bookmakers in
The Odds API feed price only `h2h`. Extended markets like BTTS can arrive with
as few as two real quotes (verified live 2026-07-28: Lincoln Red Imps v Mjällby
BTTS = Virgin Bet + LiveScore Bet only, in both `uk` and `uk,eu` regions — see
[ODDS_PROVIDERS.md](../ODDS_PROVIDERS.md)). The bookmaker comparison table — a
core feature — collapses to two rows.

## Goal

Keep the table visually full by backfilling missing bookmaker cells with an
**estimated** quote derived from the real quotes on that selection:

> estimated odds = **median of real quotes × (1 − margin)**, margin default **5%**

The margin deliberately *worsens* the estimated price so an estimate can never
win the table.

> ⚠️ **Direction of the adjustment.** The request said "median +5% uplift to
> punish the average". On **decimal odds, +5% is a reward, not a punishment** —
> higher decimal odds are better for the punter and would push estimates *up*
> the best-odds sort. The punishing direction is a **haircut**:
> `median × 0.95`. Since `median ≤ max(real quotes)`, any margin > 0
> mathematically guarantees an estimate never strictly beats the best real
> quote. This spec uses the haircut throughout.

## Non-negotiable constraints (why this is more than a display tweak)

Estimated quotes are **display-only context**. They must never become a price
anyone stakes, settles, or is deeplinked to. The current code has three paths
where a quote's odds become "real money" numbers, all via
`sortQuotesByBestOdds(...)[0]`:

| Path | File | What it does with the top quote |
|---|---|---|
| Leg creation | `apps/web/src/app/api/legs/route.ts:115` | Stores the leg's odds |
| Round lock | `apps/web/src/lib/odds/lock-round.ts:72` | Locks the odds a leg settles at |
| Acca maths | `apps/web/src/lib/odds/acca.ts` | Combined-odds calculations |

**Every one of these must see only real quotes.** The margin haircut reduces
the chance of an estimate topping the sort, but exclusion — not ranking — is
the safety mechanism. Filtering must happen at the consumer, exactly as
exchange bookmakers are excluded today via `isRetailBookmaker` in
`packages/shared/src/bookmakers.ts`.

## Design

### 1. Data model — `packages/shared/src/types.ts`

```ts
export type BookmakerQuote = {
  bookmakerId: string;
  bookmakerName: string;
  odds: number;
  link?: string;
  estimated?: true;   // NEW — absent on all real quotes
};
```

Optional flag, absent = real. Existing DB snapshots and stored legs remain
valid with no migration; old snapshots simply have no estimates.

### 2. Fill logic — new `packages/shared/src/estimated-odds.ts`

Pure function, fully unit-testable:

```ts
fillEstimatedQuotes(
  selection: MarketSelection,
  eventBookmakers: { id: string; name: string }[],   // books pricing THIS fixture
  opts: { margin: number; minRealQuotes: number }
): MarketSelection
```

Rules:

- **Candidate set = bookmakers already pricing this fixture** (present in the
  event's bookmaker list, post-`isRetailBookmaker`), minus those with a real
  quote on this selection. Never invent a bookmaker that doesn't cover the
  fixture at all — that fabricates coverage, not just a price.
- **Median, not mean** — with 2–3 quotes an outlier drags a mean badly; the
  median of two quotes is their midpoint, of three the middle value.
- **Estimate = round(median × (1 − margin), 2 dp)**, floored at 1.01.
- **Only fill thin selections:** skip when real-quote count ≥ a threshold
  (default 4) — busy markets don't need padding — and require at least
  `minRealQuotes` (default 2) real quotes to estimate from. One quote is not a
  market consensus.
- **No `link`.** A deeplink to a market the bookmaker may not offer is the
  worst failure mode of this feature. (Revisit if a bookmaker-homepage
  fallback link is wanted later.)
- **Apply per-selection, consistently per market** — every selection in the
  market gets the same candidate set, so "BTTS Yes" and "BTTS No" show the
  same bookmaker rows.

### 3. Exclusion — `packages/shared/src/bookmakers.ts`

```ts
export function realQuotes(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return quotes.filter((q) => !q.estimated);
}
```

`sortQuotesByBestOdds` and `topQuotes` change to
`filterRetailQuotes(realQuotes(quotes))`. This single edit makes leg creation,
round lock, and acca maths estimate-free with **zero changes to those three
files** — they all funnel through this sort. A new
`sortQuotesForDisplay(quotes)` keeps estimates (real quotes win ties) for the
comparison table only.

> This inverts the default the right way round: consumers get real-only unless
> they *opt in* to estimates. New code can't accidentally stake an estimate.

### 4. Wiring — `apps/web/src/lib/odds/`

Apply the fill at **market-build time** (write path), so DB snapshots carry
flagged estimates and web + mobile render identically from the store:

- `the-odds-api.ts → mapOddsEventToFixture` — bulk markets (h2h/totals/spreads)
- `event-markets.ts → mapEventToExtendedMarkets` — BTTS, double chance,
  corners/cards tiers (where thinness actually bites)

Both already compute `retailBookmakers(event.bookmakers)` — that list is the
candidate set, passed into `fillEstimatedQuotes`.

Config in `apps/web/src/lib/odds/config.ts`, following the
`OUTRIGHTS_ENABLED` pattern:

| Env var | Default | Meaning |
|---|---|---|
| `ESTIMATED_ODDS_ENABLED` | off (must be `"true"`) | Feature flag — ship dormant, enable deliberately |
| `ESTIMATED_ODDS_MARGIN` | `0.05` | Haircut: estimate = median × (1 − margin). Clamp to [0.01, 0.5]; a value ≤ 0 must be rejected, not applied |
| `ESTIMATED_ODDS_MIN_REAL_QUOTES` | `2` | Minimum real quotes to estimate from |
| `ESTIMATED_ODDS_SKIP_AT` | `4` | Don't fill selections with ≥ this many real quotes |

Add all four to `apps/web/.env.example` and the CURRENT_STATE env table.

#### Admin runtime toggle

In addition to the env flag, `/admin/odds` exposes an admin-only runtime
toggle (`apps/web/src/components/admin-estimated-odds-toggle.tsx`,
`GET`/`PATCH /api/admin/estimated-odds`) so the fill can be switched on or off
without a redeploy. Precedence:

```
effective enablement = ESTIMATED_ODDS_ENABLED (env)  AND  admin toggle (DB)
```

`ESTIMATED_ODDS_ENABLED` stays the deploy-level kill switch and default-off
gate — it must be `"true"` before the admin toggle has any effect at all.
Once it is, the admin toggle (`PlatformSetting` row, key
`estimated_odds_enabled`, default **on** when no row exists) governs the fill
at runtime. `estimatedOddsEffectivelyEnabled()`
(`apps/web/src/lib/odds/estimated-odds-runtime.ts`) computes this at the same
choke point as the fill itself — the two market-build write paths in
`odds-store.ts` (`refreshBulkFixturesFromApi`, `refreshEventMarketsFromApi`).

**Caching caveat:** odds are cached in DB snapshots (`OddsBulkSnapshot`,
`OddsEventSnapshot`). Flipping the admin toggle takes effect on the **next**
snapshot refresh (cron warm or an on-demand fetch past TTL) — not instantly
for reads served from an already-cached snapshot. This mirrors how
`ODDS_API_CACHE_TTL_MS` already governs staleness for every other odds
change.

Uses the existing `requireAdmin()` authorization (no new auth logic) — the
same gate protecting `/admin/competitions` and every other admin route.

### 5. Display — web + mobile

- `apps/web/src/components/group-ui.tsx` — bookmaker table: estimates render
  muted/italic with an **"est."** badge and no tap-through. Best-price
  highlight uses `sortQuotesByBestOdds` (real only) — unchanged.
- `apps/mobile/src/components/group-round.tsx` — same treatment. The
  `estimated` flag travels through the shared `Fixture` type, so mobile needs
  only the render change, no data work.

Labelling is a **product-integrity requirement, not polish**: an unlabelled
estimate is a fabricated price attributed to a real bookmaker. Users tapping
through to a book that doesn't offer the market at that price is the exact
trust-destroyer this design avoids. Do not ship the fill with the badge
"coming later".

### 6. Merge path check

`apps/web/src/lib/odds/merge-markets.ts` merges bulk + per-event markets.
Verify a real quote always replaces an estimate for the same
bookmaker/selection on merge, and estimates from a stale snapshot never
overwrite fresh real quotes. Add a test pinning this.

## Test plan (pin these before enabling the flag)

`packages/shared/src/estimated-odds.test.ts` + additions to existing suites:

1. Median: 2 quotes → midpoint; 3 → middle; even counts → mean of middle two.
2. **Haircut direction:** estimate < median always; margin 0.05 with median
   2.00 → 1.90 (not 2.10).
3. **Never-top invariant:** for arbitrary real quotes and any margin > 0, no
   estimate exceeds the best real quote (property-style loop over fixtures).
4. Candidate set: only fixture-covering retail books; no estimate for a book
   with a real quote; exchanges never estimated.
5. Thresholds: no fill at ≥ SKIP_AT real quotes; no fill below
   MIN_REAL_QUOTES.
6. `sortQuotesByBestOdds` / `topQuotes` drop estimates; `sortQuotesForDisplay`
   keeps them, real wins ties.
7. Leg-creation and lock-round paths never persist a quote with
   `estimated: true` (integration-level assertion).
8. Flag off ⇒ output byte-identical to today (mirrors
   `outrights-flag.test.ts`).
9. Admin toggle off ⇒ no fill even with `ESTIMATED_ODDS_ENABLED="true"`;
   toggle state persists across reads; effective enablement is the AND of
   both gates (`estimated-odds-runtime.test.ts`).

## Delivery phases

| Phase | Scope | Ship gate |
|---|---|---|
| 1 | Types + `fillEstimatedQuotes` + exclusion in shared, fully tested | Unit tests green; no behaviour change (flag off) |
| 2 | Wiring in odds pipeline + config + merge-path test + admin runtime toggle | `ESTIMATED_ODDS_ENABLED` still off in prod |
| 3 | Web + mobile display (badge, muted style, no link) | Visual check on a thin market via mock provider |
| 4 | Enable in prod; verify on a real qualifier fixture | Screenshot table before/after; confirm lock-round ignores estimates on a live round |

Phases 1–3 are one PR if preferred; the flag keeps prod inert either way.

## Risks

| Risk | Mitigation |
|---|---|
| Estimate staked/settled | Real-only default in shared sorts (§3) + tests 6–7 |
| Estimate tops table | Margin haircut + never-top test 3 (defence in depth; exclusion is primary) |
| User mistakes estimate for a real price | Mandatory badge + no deeplink (§5) |
| Bookmaker objects to attributed fake price | Badge + candidate set limited to books covering the fixture; revisit wording if affiliate deals (ROADMAP #5) land — an *affiliate partner* shown with estimated odds needs their sign-off |
| Median from 2 quotes is noisy | MIN_REAL_QUOTES floor; accept residual noise — margin biases it against us, not the user |

## Relationship to BetsAPI trial

This feature treats the symptom (thin tables); the BetsAPI trial
([ODDS_PROVIDERS.md](../ODDS_PROVIDERS.md) open decision #3) treats the cause
(missing real prices, incl. bet365). Do both: real depth shrinks how often the
fill triggers, and the fill covers the long tail no provider fixes.

## Model recommendation for delivery

**Sonnet 5.** This is a well-scoped TypeScript change: pure functions with a
precise spec, a mechanical type extension, and two small render tweaks — the
hard thinking (invariants, exclusion seams, direction of the margin) is done
here. Sonnet 5 executes this class of task reliably and cheaply; Opus/Fable
would add cost, not correctness. One session for Phases 1–2, one for Phase 3.
If anything warrants a stronger model, it's a **post-implementation
`/code-review`** pass focused on tests 3, 6 and 7 — the invariants that make
this feature safe.

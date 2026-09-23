# Current state (as-built)

Last updated 23 September 2026 (email verification: stricter sign-up email checks + confirm-your-email gate on web and mobile; unconfirmed addresses get no notification emails; admin `/admin/unverified` + stale-account cleanup). Previously 19 September 2026 (FT score stability + auto-reconcile for disallowed goals / VAR; group tabs: Bet / Leaderboard / History / Chat). **This file is the source of truth for agents — update when you ship. Do not rely on chat history.**

Production: **https://www.tikiacca.com** (apex → 301 to www via Cloudflare).

> **Rebrand (July 2026):** The Syndicate → **Tiki Acca** ([spec](./specs/rename-tiki-acca.md)). Groups are called "groups". **Legacy internal names kept on purpose** — GCP resources (Cloud SQL `the_syndicate`, Cloud Run `the-syndicate-web`, artifact repo), mobile SecureStore keys (`syndicate_token`/`syndicate_user`), GitHub repo name. Do not rename these.

Mobile (`apps/mobile/`) — v1 parity shipped and EAS project linked at `@the-syndicate/tiki-acca` (`0ad18d34-5681-4e1c-a208-e45064b0515c`). **iOS is live in App Store Connect** (submitted, build 5 of version 1.0.0, 2026-07-22). **Android** has a production build with Firebase push wired up but is not yet submitted — blocked on Play Console identity verification; see [ANDROID_LAUNCH.md](../apps/mobile/ANDROID_LAUNCH.md) for full status. Release process (versioning, git tagging, OTA updates via `eas update`) documented in [apps/mobile/README.md](../apps/mobile/README.md#versioning). The non-scrolling sign-in screen doubles as a compact brand landing page using shared copy from `packages/shared/src/brand.ts`. Mobile auth uses a revocable, non-expiring `MobileSession` bearer token stored in SecureStore, so users remain signed in until explicit logout; legacy 30-day JWTs remain valid during rollout. Logged-in chrome: brand-only `AppHeader` (not a home link) + bottom `AppTabBar`. Groups list lives at `/(main)/home` (not `/`) so tab switches never hit the auth stack; its first load is held behind a full-page loading state to prevent layout shift. Root `Stack.Protected` gates sign-in/sign-up, and routes signed-in users with an unconfirmed email to `app/verify-email.tsx` instead of `(main)` (see [Email verification](#email-verification)). **Developer testing:** Expo Go / device build ([DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md)).

---

## Agent onboarding (start here)

**Do not rely on chat history.** Follow this order:

1. **This file** — what exists, where code lives, env vars, limitations.
2. **[ROADMAP.md](./ROADMAP.md)** → **Next** — current build priority.
3. **Matching spec** in [specs/](./specs/) — checklist for the task.
4. **[AGENTS.md](../AGENTS.md)** — conventions, doc maintenance rules.

### Local setup

```bash
npm install
docker compose up -d          # PostgreSQL
cp apps/web/.env.example apps/web/.env.local   # fill DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL
npm run db:migrate:deploy
npm run db:generate
npm run dev                   # http://localhost:3000
```

Omit `ODDS_API_KEY` for mock fixtures. Add `FOOTBALL_DATA_API_KEY` and/or `API_FOOTBALL_KEY` + `CRON_SECRET` to test match sync locally. Set `ADMIN_EMAILS` to enable the Admin tab.

### Deploy

PRs and pushes to `main` → `.github/workflows/ci.yml`: lint (web, mobile, `packages/client`), typecheck, tests against Postgres.

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`): build → `db:migrate:deploy` → Cloud Run.

Match sync + odds warm: Cloud Scheduler (Terraform) → `POST /api/internal/sync-matches` (every 5 min UTC) and `POST /api/internal/warm-odds-cache` (every 6 h UTC) with Bearer `CRON_SECRET` from Secret Manager. See [DEPLOYMENT.md](./DEPLOYMENT.md).

### Code map

| Subsystem | Path |
|-----------|------|
| API routes | `apps/web/src/app/api/` |
| Shared schemas/types | `packages/shared/src/` — request schemas (`schemas.ts`) and the API response contract (`api-types.ts`). Member-facing routes check their output against it with `serialized(body) satisfies <X>Response` (`apps/web/src/lib/api-response.ts`) |
| Shared client hooks | `packages/client/src/` (`@tiki-acca/client`, React without DOM/RN): `createApiFetcher`/`ApiError`, `GroupDataProvider`/`useGroupData`, `useGroupThread` (chat), `useLegPicker`, `useBlockedMembers`, Bet-tab actions (`createRound`, `lockRound`, `removeLeg`, `toggleReaction`). Web fetcher: `apps/web/src/lib/api-client.ts`; mobile: `apps/mobile/src/api/use-api-fetcher.ts` |
| Shared view logic & copy | `packages/shared/src/round-view.ts` (`deriveRoundView` — everything the Bet tab shows; `accaSummaryCopy`), `stats-display.ts` (`filterUserStatsByGroup`, `buildShareText`, chart labels), `copy.ts` (`copy`, `COMPLIANCE` gambling wording + helpline, `NOTIFICATION_PREFERENCE_SECTIONS`) |
| Market conflict helpers | `packages/shared/src/market-conflicts.ts` |
| Prisma schema | `packages/database/prisma/schema.prisma` |
| Odds | `apps/web/src/lib/odds/` |
| Settlement | `apps/web/src/lib/settlement/`, `apps/web/src/lib/results/` |
| Stats | `apps/web/src/lib/stats/` |
| Group chat | Dedicated web/mobile Chat tabs, `apps/web/src/components/group/chat.tsx`, `apps/mobile/src/components/group-chat.tsx` (both on `useGroupThread`; Report / Block on both), APIs under `api/groups/[id]/messages` + `api/messages/[id]`, lifecycle writers/tests in `apps/web/src/lib/chat/`, shared contract `packages/shared/src/chat.ts` |
| Notifications | `apps/web/src/lib/notifications/` (branded email templates + layout; logo at `public/brand/email-logo.png`) |
| Auth | `apps/web/src/lib/auth.ts`, `apps/web/src/lib/auth.config.ts` |
| Settlement (auto) | `apps/web/src/lib/settlement/auto-settle-round.ts` |
| Round lifecycle | `apps/web/src/lib/rounds/open-round.ts`, `create-additional-round.ts`, `claim-lock-round.ts`, `lock-open-rounds-at-kickoff.ts`, `first-kickoff.ts` |
| Group UI | `apps/web/src/components/group/` — round screen split into `submit-leg-form.tsx`, `acca-summary.tsx`, `legs-list.tsx`, `round-progress.tsx`, `leaderboard.tsx` (+ `round-helpers.tsx`); `stats.tsx`, `history.tsx`, `chat.tsx`. Mobile equivalent: `apps/mobile/src/components/round/`. Shared display helpers (`formatKickoff`, `legOutcomeLabel`, `mergeFixtureMarkets`): `packages/shared/src/round-display.ts` |
| App navigation | `apps/web/src/components/layout/` (`app-nav.tsx`, `mobile-nav.tsx`, `app-tab-bar.tsx`, `header.tsx`, `site-footer.tsx`), `components/group/nav.tsx` |
| Logo & marketing | `apps/web/src/components/logo.tsx`, `components/marketing/` (`marketing-shell.tsx`, `session-aware-marketing-header.tsx`, `marketing-header.tsx`, `marketing-ctas.tsx`), `lib/marketing-content.ts`; reusable social assets, X profile header, and capture/composer workflow in `tools/marketing/`; video ad screen captures via `npm run video-ad:seed` / `video-ad:capture` (`tools/marketing/seeds/video-ad-seed.ts`, `tools/marketing/scripts/capture-video-ad.mjs`, scenario in `tools/marketing/video-ad/scenario.json` — see [VIDEO_AD_BRIEF.md](./VIDEO_AD_BRIEF.md) §7) |
| Blog | `apps/web/content/blog/*.mdx` (posts), `apps/web/src/lib/blog.ts`, `app/blog/` — publish = git push; `draft: true` hides in prod. SEO frontmatter-driven (canonical, OG image, `BlogPosting` JSON-LD, tag hubs). Strict authoring standards: [BLOG.md](./BLOG.md) |
| SEO | `apps/web/src/app/sitemap.ts`, `robots.ts` — public pages set self-referencing `alternates.canonical` (`/`, `/about`, `/privacy`, `/cookies`, `/terms`, `/support`, blog). Auth/account routes are `noindex` and listed in `robots` disallow. Canonical host is `https://www.tikiacca.com` (`metadataBase`). Apex/`*.run.app` redirects or 403s in Search Console are expected (www via Cloudflare; origin auth blocks direct Cloud Run crawls). |
| Favicon / app icons | `apps/web/src/app/icon.svg`, `favicon.ico` (16/32/48), `apple-icon.tsx` (`lib/brand/rondo-icon.tsx`) — extra-wide apex-up Triangle rondo disc; glyph source in `logo.tsx`. Metadata URLs use `?v=` cache-bust (`layout.tsx`) — bump when the mark changes |
| Brand archive | `docs/brand/logo-archive/v6-wide-apex-up/` (previous live logo vectors + rollback instructions); rejected explorations live in git history — see [BRAND.md](./BRAND.md#archived-explorations) |
| Group layout | `apps/web/src/app/groups/[id]/layout.tsx`, `components/group/layout-client.tsx` (`GroupDataProvider` from `@tiki-acca/client`; 403/404 → dashboard) |
| Group list | `apps/web/src/lib/groups/list-group-summaries.ts` — one builder for the dashboard and `GET /api/groups` (unread counts in one query) |
| Scoring | `packages/shared/src/scoring.ts` |
| Competitions catalogue | `packages/shared/src/competitions.ts` |
| Platform admin | `apps/web/src/lib/admin/` (`auth.ts` = `requireAdmin` / `ADMIN_EMAILS`), `lib/competitions/settings.ts`, `app/admin/`, `components/admin/` |
| Analytics | `apps/web/src/lib/analytics.ts`, global web tracker in `components/analytics/authenticated-page-tracker.tsx`, mobile tracker in `apps/mobile/src/analytics/activity-tracker.tsx`, admin report at `/admin/activity` |

### What's next (July 2026)

See [ROADMAP.md](./ROADMAP.md) → **Next — backlog**. MVP shipped; validate with real users first.

---

## What works today

| Area | Status |
|------|--------|
| Auth (email/password, Auth.js JWT sessions) | ✅ |
| Email verification — stricter sign-up email checks, confirm-link email, gate on web + mobile (existing users included) | ✅ |
| Groups, invite codes, join links (`?code=`), no member cap | ✅ |
| Legs per member (1 / 2 / 3) — owner create + Settings; updates open rounds | ✅ |
| Concurrent active bets — owner cap 1–5; member-created; web + mobile switcher | ✅ pending owner test |
| One leg per fixture within a round (prevents unpriced correlated bet builders) | ✅ |
| At least one active round per group (auto-created with group / after final active settlement) | ✅ |
| Rounds: open → locked → settled (badges: **Bet Open**, **Bet Locked**, **Bet Settled**) | ✅ |
| Live odds ([The Odds API](https://the-odds-api.com/)) + mock fallback | ✅ |
| Markets: h2h, totals (dynamic lines), spreads*, BTTS, double chance, correct score, corners/cards† | ✅ |
| Per-leg competition picker (admin-controlled; World Cup live by default) | ✅ |
| Leg picker: best odds only per selection | ✅ |
| Acca lock: best combined bookmaker across all legs | ✅ |
| Acca bookmaker rankings (best odds first, stored at lock) | ✅ |
| Real bookmaker betslip deeplinks (The Odds API) | ✅ |
| Match table + two-source results sync cron (football-data.org + API-Football consensus) | ✅ |
| Auto-settle corners markets from API-Football match stats | ✅ |
| Hands-off auto-settle (5-min cron; early settle on first loss; deferred remaining legs) | ✅ |
| Email + push notifications (lock, settle, pick reminders) | ✅ |
| System-only settlement (owner settle removed July 2026) | ✅ |
| Editable picks until first kickoff (open + locked; locked edits reprice acca; web + mobile) | ✅ |
| Admin settlement queue (`/admin/settlement`, overdue-leg flags, manual settle, outcome correction) | ✅ |
| Admin match results (`/admin/results`, score override + lock, FT confirmation window) | ✅ |
| Unit-stake points + leaderboard | ✅ |
| Group stats summary + cumulative points chart | ✅ |
| Member stats breakdowns + multi-member chart | ✅ |
| Dashboard cross-group stats + share cards | ✅ |
| Split app layout (Groups / Performance nav; group tabs) | ✅ |
| Platform admin dashboard + leaderboards (`/admin`) | ✅ |
| Product analytics (per-user web/mobile logins, 30-minute visits, page/screen views, last active) | ✅ |
| Marketing site (homepage, about, Turf Green + Triangle rondo logo) | ✅ |
| Points-first stats UX + stake → profit converter | ✅ |
| Locked round UX: picks first, locked odds, bookmaker comparison until first result, in-progress leg results | ✅ |
| Round history, progress UI, landing/SEO | ✅ |
| Blog (file-based MDX, static, `/blog`) + sitemap.xml + robots.txt | ✅ |
| Longstanding group Chat tab + Bet-labelled lifecycle messages + reactions (web + mobile) | ✅ |
| Chat unread badges + batched push preference | ✅ |
| Chat Report / Block + blocked-members list with Unblock (web + mobile) | ✅ |
| Mobile: share invite link (native share sheet), home points summary + new-user steps, Performance group filter, share performance / group stats, per-member line chart | ✅ |

\*Asian handicap only from exchange bookmakers in current World Cup UK feed — filtered out; handicap UI empty for those fixtures.

**Line keys in market types.** Lines are embedded in `marketType` (`over_under_<k>`, `corners_over_under_<k>`, `cards_over_under_<k>`, `<prefix>_handicap_<k>`, and `…__<k>` player/team totals) as **tenths**: `encodeLineKey()` / `decodeLineKey()` in `packages/shared/src/market-groups.ts` are the single codec (`lineKey()` in `market-builders.ts` delegates). 2.5 → `25`, 2 → `20`, 10 → `100`, −1.5 → `m15`; 0 stays `0` and 0.5 stays `05`, so half-line keys are unchanged from before. **Quarter lines (2.25, −0.75, …) are skipped** by every builder — split-stake settlement (half won / half void) cannot be represented on a leg. Before September 2026 whole lines were encoded without the tenths digit (`over_under_2` → decoded as 0.2), so whole-line goal O/U, total-corners O/U and team-corners legs auto-settled against the wrong line; legacy rows are repaired with `npm run db:maintenance -- preview-line-keys` / `fix-line-keys --execute` (reads the real line from `marketLabel` / `selectionLabel`, since legacy `10` meant line 10 but now means 1.0) and then `resettle-round` for each settled round it lists. Tests: `packages/shared/src/market-groups.test.ts`, `apps/web/src/lib/odds/market-builders.test.ts`, `apps/web/src/lib/results/resolve-leg.test.ts`, `apps/web/src/lib/legs/repair-line-keys.test.ts`.

---

## Scoring

**Acca points** in `packages/shared/src/scoring.ts`:

| Outcome | Group points | Member points |
|---------|--------------|---------------|
| Acca won | `combinedOdds − 1` | `odds − 1` on each won leg (`0` if void) |
| Acca lost | `−1` | Same per-leg rule: won → `odds − 1`, lost → `−1`, void → `0` |

Example: acca @ 3.44 (legs 1.6 × 2.15) → **2.44** group pts; members **0.6** and **1.15** (not split). If that acca loses because one leg fails, the winning member still keeps `odds − 1` while the losing member gets `−1` (group still `−1`).

**Stats:** `groupAccaRoundPoints()` for group totals; `memberAccaLegPoints()` for members. Dashboard “Your points”, group leaderboard (ranking + stats), and cross-group Performance **recompute live** from resolved leg outcomes — including legs on **locked in-progress accas** (not only when the round fully settles). Group −1 applies as soon as a leg loses; member points accrue per resolved leg; charts include the in-progress bet with partial totals (tooltip date uses `lockedAt` until `settledAt`). Fully settled rounds still drive acca £ P/L sums and “total rounds” counts. Helpers: `apps/web/src/lib/stats/helpers.ts` (`roundsForPerformanceStats`, `statsRoundWhere`). Denormalized `Leg.pointsAwarded`, `GroupMember.points`/`legsWon`/`legsLost` and `User.totalPoints`/`legsWon`/`legsLost` are written incrementally at settlement/deferred resolution and were **backfilled** by migration `20260716120000_backfill_member_leg_points`. Admin platform **group** leaderboard recomputes live via `groupNetPoints()` (same as group Performance — not the sum of `GroupMember.points`). Admin **player** leaderboard still reads `User.totalPoints` / W-L columns. Performance charts use bet number on the X-axis (`Bet N` / `Start`); settlement/lock date in tooltips (`dateLabel`).

**Points-first UX:** Points are the **primary metric** across performance pages, leaderboards, share cards, and round history. Users convert points to money with `profitFromPoints(points, stake)` — profit = points × stake (£). UI: `StakeProfit` component (default stake £10). **Group / acca points** use `pointsTone()` (negative → red). **Individual pick rows** use `pointsToneFromOutcome()` (won → green, lost → red).

**Acca P/L in DB:** `Round.profitLossGbp` still computed at settle (£10 default stake) for admin “successful acca” counts and settlement emails — not shown as the primary user-facing metric.

---

## Odds & competitions

Twenty competitions in `packages/shared/src/competitions.ts`: EPL, Championship, League One, League Two, La Liga, Ligue 1, Serie A, Bundesliga, Eredivisie, Primeira Liga, Brazil Série A, Champions League, European Championship, Copa Libertadores, World Cup, Champions League Qualification, Europa League, Carabao Cup (EFL Cup), UEFA Nations League, and FA Cup (Odds API inactive until the first round in November). **Admin toggles** which are visible in the leg picker (`CompetitionSetting` table; `/admin/competitions`). Default: **World Cup only**; newly discovered catalogue rows are created disabled. Match sync covers enabled competitions plus any disabled competition that still has a pending leg. Every competition has an `apiFootballLeagueId`; the free-tier football-data.org ones also have a `footballDataCode`. League One, League Two, CL Qualification, Europa League, Carabao Cup, Nations League and FA Cup are **API-Football only** — they auto-settle when `API_FOOTBALL_KEY` is set and show as manual settlement in `/admin/competitions` when it isn't (see [Results sources](#results-sources-consensus)).

Fixture list uses The Odds API with `commenceTimeFrom` in `YYYY-MM-DDTHH:MM:SSZ` format (no milliseconds) and client-side upcoming filter. When `ODDS_API_KEY` is set, **no mock fallback** — empty list if the bookmaker feed has no upcoming fixtures. **Production never serves demo fixtures**; mock data is local dev only (`source: "mock"`). Check `GET /api/health` → `odds: "configured" | "missing"`.

### Odds flow

```
GET /api/competitions                 → active catalogue (id + name)
GET /api/fixtures?competition=epl     → bulk markets (h2h, totals, spreads)
GET /api/fixtures/[id]/markets?competition=epl&tier=core → lazy per-event tier (default `core` = 5 credits; `specials` on demand)
POST /api/legs                        → best retail quote; stores competitionId slug
(lock) lockRoundWithAccaPricing()     → re-fetch quotes, rankAccaBookmakers(), store deeplinks on Leg
```

At lock, `Leg.betslipUrl` stores the chosen bookmaker's **real** outcome/event deeplink (never a generic football hub); `Leg.bookmakerLinks` maps retail bookmakers → Odds API links only. **Hub URLs** (`BOOKMAKER_HUB_URLS`) are a last-resort UI fallback and are tagged `linkQuality: "hub"`. Matching featured and alternate market lines (for example, standard + alternate Over 2.5 goals) merge bookmaker quotes by market type, selection, and bookmaker, retaining the best quote and available deeplink; this avoids losing broader alternate-feed coverage. New/edited picks enforce **one leg per fixture per round** because The Odds API exposes single-selection prices, not bookmaker correlation-adjusted bet-builder prices; combined odds therefore multiply legs from separate fixtures only. Occupied fixtures are disabled with a short accuracy explanation in both pickers, and the public homepage FAQ provides the full rationale. **While bet is open:** leg picker shows best odds only; **Compare bookmakers** shows a live current ranking + refreshed deeplinks from current quotes. **Once locked:** **final combined odds** + the **Compare bookmakers** ranking captured at lock (so members can pick the best bookmaker when placing the bet); primary CTA opens the best available deeplink (first pick when multi-leg) until the first result, then tracking only. Per-leg **Open** uses `bookmakerLinks[recommendedBookmaker]` when present.

Requires live odds (`ODDS_API_KEY`) — mock fixtures have no deeplinks. Odds are stored in **PostgreSQL** (`OddsBulkSnapshot`, `OddsEventSnapshot`) and refreshed by cron (`POST /api/internal/warm-odds-cache`) or on demand from **Admin → Odds** (`POST /api/admin/warm-odds-cache` — same `warmOddsCache()` path). User picks read the DB for bulk fixtures + core tiers; set `ODDS_DB_ONLY=true` in production to block live API calls from those paths. **Exception:** the **specials** tier (corners & cards) is never cron-warmed, so “Load more markets” still live-fetches on miss and caches the snapshot.

**Estimated odds fill** (dormant — [specs/estimated-odds-fill.md](./specs/estimated-odds-fill.md)): thin selections (few real bookmaker quotes) can be backfilled with a haircut-median estimate (`estimated: true` on `BookmakerQuote`) so the comparison table stays visually full. Applied at market-build time in `mapOddsEventToFixture` / `mapEventToExtendedMarkets`, gated on `ESTIMATED_ODDS_ENABLED` (env, deploy-level) **and** an admin runtime toggle at `/admin/odds` (`PlatformSetting` row, `GET`/`PATCH /api/admin/estimated-odds`) — both must be on. `sortQuotesByBestOdds`/`topQuotes` (`packages/shared/src/bookmakers.ts`) exclude estimated quotes so leg creation, round lock, and acca maths stay real-only; `sortQuotesForDisplay` is the opt-in variant for the UI. Off by default in production.

### Odds API usage (summary)

Full budgeting: [DEPLOYMENT.md — The Odds API](./DEPLOYMENT.md#the-odds-api--calls-credits--cron).

| Call type | Markets | Credits | When |
|-----------|---------|---------|------|
| Bulk fixtures | `h2h`, `spreads`, `totals` | **3** | Cron: once per enabled competition per warm run |
| Core extended | `btts`, `double_chance`, `correct_score`, `alternate_spreads`, `alternate_totals` | **5** per fixture | Cron + auto on fixture pick; extra goal handicaps & O/U lines |
| Specials | corners/cards (7 keys) | **7** per fixture | User only (“Load more markets”); not cron-warmed |

**Cron:** `warm-odds-cache` every **6 h UTC** → `3 × competitions + 5 × N` credits per run (`N` = fixtures in warm window). `sync-matches` (every 5 min) uses football-data.org + API-Football, **not** The Odds API.

**Production target:** `ODDS_DB_ONLY=true` so bulk/core user routes do not call the API (specials still may on demand).

### Acca bookmaker rankings

At lock, `rankAccaBookmakers()` in `apps/web/src/lib/odds/acca.ts` ranks all retail bookmakers by combined acca odds. Stored as `Round.accaBookmakerRankings` (JSON). Older locked rounds backfill lazily on `GET /api/groups/[id]`. **Open rounds** use a live current ranking for the Compare UI. **Locked rounds** show the ranking captured at lock. Web and mobile display the top three by default, with **Show all {N} bookmakers** / **Show top 3** controls for the complete ranking. `GET /api/groups/[id]` refreshes Odds API deeplinks for the CTA and per-leg Open (odds remain frozen at lock). Multi-leg CTAs label **Open first pick** (or **Open {bookmaker}** for hubs) — UK books rarely expose a one-click full-acca URL.

**Bookmaker logos** (Compare / rankings UI): Google favicons via `packages/shared/src/bookmaker-branding.ts` (`BOOKMAKER_DOMAINS` → `bookmakerLogoUrl`). Web: `apps/web/src/components/bookmaker-logo.tsx`; mobile: `apps/mobile/src/components/round/bookmaker-logo.tsx`. Odds API key for 888sport is `sport888` — mapped to `888sport.com` (naive guess would hit `sport888.com` and show a generic globe).

Types: `packages/shared/src/acca.ts`. Migration: `20260710010000_acca_bookmaker_rankings`.

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/odds/provider.ts` | Live vs mock orchestration (per competition) |
| `packages/shared/src/competitions.ts` | Competition catalogue |
| `apps/web/src/lib/odds/the-odds-api.ts` | Bulk + per-event API |
| `apps/web/src/lib/odds/event-markets.ts` | Per-event markets (BTTS, props, corners, etc.) |
| `apps/web/src/lib/odds/odds-store.ts` | PostgreSQL odds snapshots (bulk + per-event tiers) |
| `apps/web/src/lib/odds/warm-cache.ts` | Cron odds refresh logic |
| `apps/web/src/lib/odds/market-builders.ts` | Odds API → app market mappers (`lineKey` → shared `encodeLineKey`; quarter lines skipped) |
| `apps/web/src/lib/legs/repair-line-keys.ts` | Legacy whole-line `marketType` repair (used by `db:maintenance fix-line-keys`) |
| `apps/web/src/lib/odds/merge-markets.ts` | Merge matching featured + alternate market quote coverage |
| `apps/web/src/lib/odds/quotes.ts` | Quote helpers + deeplink resolution (no hub fallback) |
| `apps/web/src/lib/odds/betslip-links.ts` | Ranked/per-leg links; hub detection; CTA link quality |
| `apps/web/src/lib/odds/acca.ts` | Acca bookmaker ranking + best combined |
| `apps/web/src/lib/odds/lock-round.ts` | Lock + reprice + store deeplinks; live link enrichment |
| `packages/shared/src/bookmakers.ts` | Retail filter, sort best odds |
| `packages/shared/src/bookmaker-branding.ts` | Favicon logo domains (incl. `sport888` → 888sport.com) |
| `apps/web/src/components/bookmaker-logo.tsx` | Bookmaker logo + initials fallback (web) |
| `apps/web/src/components/group/submit-leg-form.tsx` | Progressive 4-step leg picker (competition, fixture, and market lists collapse after selection; **Change competition** / **Change fixture** / **Change market** to browse again; multi-leg rounds reset picker after each submit, show leg progress copy, and trigger brief **Leg added** / **All legs added** celebrations), locked round picks, settle UI |
| `apps/web/src/components/layout/app-nav.tsx` | Header nav (desktop): Home / About / Groups / Performance / Admin / Blog |
| `apps/web/src/components/layout/mobile-nav.tsx` | Compact hamburger menu below `md` for marketing + app headers |
| `apps/web/src/app/account/page.tsx` | Account — profile, notification prefs, blocked members (`components/blocked-members.tsx`), sign out, delete (greeting in header links here) |
| `apps/web/src/components/group/nav.tsx` | Group tabs: Bet / Leaderboard / History / Chat (/ Settings for owners) |
| `apps/web/src/components/group/layout-client.tsx` | Shared group shell + `GroupDataProvider` |

---

## Email verification

Every account must confirm its email before using the app. Applies to accounts created before this shipped too: migration `20260923120000_email_verification` leaves every existing `User.emailVerifiedAt` null, so they hit the gate on their next visit and are emailed a link automatically.

- **Sign-up checks:** `checkEmailFormat` / `signUpEmailSchema` (`packages/shared/src/email.ts`) — stricter than Zod `.email()`: label/TLD rules, rejects reserved domains (`example.com`, `.test`, `.local`, …) and suggests fixes for common typos (`gmail.con` → `gmail.com`). Server also checks the domain has MX (or A/AAAA) records (`apps/web/src/lib/email-domain.ts`, 3s timeout, fails open on DNS errors). Same checks on the unverified change-email route. Mobile sign-up runs `checkEmailFormat` client-side.
- **Links:** `lib/email-verification.ts` — 32-byte tokens stored SHA-256 hashed in `EmailVerificationToken`, 24h expiry, pinned to the address they were sent to (a link for an old address stops working after a change). Resending keeps earlier unexpired links valid. Reopening a used link reports success once verified. Links always open the web `/verify-email` page (no iOS AASA / Android App Link for it); mobile notices via the status endpoint. Without Resend configured, non-production logs the link to the server console. A successful **password reset** also marks the email verified (it proves inbox ownership).
- **Enforcement (layered):** `requireSession()` in `lib/api-auth.ts` returns **403 `{ code: "email_unverified" }`** for unverified users on web and mobile bearer auth (DB-backed, the hard gate); routes that must work while unverified pass `{ allowUnverified: true }` (verify-email status/resend/change-email, analytics events, account delete, push-token delete). Web middleware (`auth.config.ts` `authorized`) redirects protected paths to `/verify-email?callbackUrl=…` using the `isEmailVerified` JWT flag, which `auth.ts` refreshes from the DB on each `auth()` call; `components/email-verification-guard.tsx` covers stale cookies client-side. Path helpers live in client-safe `lib/auth-paths.ts`. (The next-auth field is `isEmailVerified` to avoid Auth.js's `AdapterUser.emailVerified: Date`; the shared `AuthUser` used by mobile has `emailVerified?: boolean`.)
- **Mobile:** sign-in response includes `emailVerified`; `AuthProvider` re-reads `/api/auth/verify-email/status` on startup and flips the user to unverified on any `email_unverified` 403 (`setEmailUnverifiedListener` in `src/api/client.ts`; both `api()` and the shared-hook fetcher in `src/api/use-api-fetcher.ts` route errors through `reportEmailUnverified`, using the `code` that `@tiki-acca/client`'s `ApiError` now carries). Root layout guards `(main)` behind `emailVerified !== false`; `app/verify-email.tsx` auto-sends a link if none is pending and re-checks when the app returns to the foreground. Pending invite codes survive verification and are consumed by `(main)/_layout`. **Old-build compatibility:** the app sends `x-supports-email-verification: 1` (`EMAIL_VERIFICATION_CLIENT_HEADER`, `CLIENT_HEADERS` in `src/api/client.ts`), and `requireSession` only returns `email_unverified` to bearer-token requests that carry it. iOS build 5 and older predate both the verify screen and `expo-updates` (no OTA channel), so their unverified users are let through rather than shown errors; web is always enforced. This lapses on its own as users move to newer builds — to close it fully, delete the header check in `lib/api-auth.ts` (web deploy only, no app update).
- **Analytics:** `email_verified` event recorded when a link is consumed.
- **Notifications:** lock / settle / pick-reminder **emails are never sent to unconfirmed addresses** (`sendEmailToUser` in `lib/notifications/channels/email-channel.ts`) — they may be typos or junk, and bounces hurt sender reputation. Push still goes out. `isRoundNotificationComplete` ignores the email channel for them so round retries don't loop. Unconfirmed members still count towards the round quota (rounds lock at first kickoff regardless); remove junk accounts via the admin page.
- **Admin — `/admin/unverified`:** paginated, searchable list of unconfirmed accounts (tombstoned deleted accounts excluded) with joined date, last link sent, groups, leg count and a "domain can't receive mail" flag (live DNS check per page). Actions: **Fix email** (validated like sign-up, uniqueness + domain checks, then sends a new link — for users who can't sign in because they don't know their typo'd address), **Resend link**, **Remove** (`removeUnverifiedAccount` in `lib/account-removal.ts`: owned groups handed over as on self-delete; accounts with no legs or chat are hard-deleted, otherwise anonymised to "Former member"; either way removed from every group). Routes: `PATCH` / `DELETE /api/admin/unverified-users/[id]` (admin only, refuse verified or deleted accounts).
- **Cleanup:** `npm run db:maintenance -- preview-stale-unverified [--days 30]` / `delete-stale-unverified [--days 30] --execute` hard-deletes unconfirmed accounts with no group membership, owned group, leg or chat message, older than `--days` (min 7). The clock starts at the later of sign-up and when migration `20260923120000_email_verification` was applied (read from `_prisma_migrations`), so pre-existing accounts get the full grace period.

## Web pages

Protected routes enforced in `apps/web/src/middleware.ts` / `auth.config.ts`: `/dashboard`, `/groups/*` (**except** `/groups/join`), `/performance`, `/admin`, `/account`, `/settings`. `/groups/join` is public so invite links work signed-out — the page prompts Sign in / Sign up with `callbackUrl` back to the invite (`lib/callback-url.ts`). Middleware uses edge-safe `auth.config.ts` only (no Prisma); credentials + DB live in `auth.ts`. Middleware also runs on all non-static routes for the **origin-auth check** (`ORIGIN_AUTH_SECRET` + Cloudflare `x-origin-auth` header — blocks direct `*.run.app` traffic; `/api/health` and `/api/internal/*` exempt). Signed-in users with an unconfirmed email are redirected to `/verify-email` from every protected route and `/groups/join` (see [Email verification](#email-verification)). Auth endpoints are **rate-limited** per IP (`lib/rate-limit.ts`): sign-in 10/5min, sign-up 5/hour, verify-email 20/hour; per user: resend 3/hour, change-email 5/hour. See [DEPLOYMENT.md](./DEPLOYMENT.md#ddos--abuse-protection).

| Path | Purpose |
|------|---------|
| `/` | Landing — hero, value props, how it works, FAQ, CTA (signed-in: app header + Groups/Performance CTAs) |
| `/about` | Product story, what we are/aren’t, responsible gambling (reachable when signed in) |
| `/blog`, `/blog/[slug]` | File-based MDX blog (static; drafts hidden in prod) |
| `/sign-in`, `/sign-up` | Auth — sign-up collects **first name** + **last name**; both preserve `callbackUrl` (e.g. invite return). Unverified users land on `/verify-email` after either |
| `/verify-email` | Confirm-your-email gate (noindex). `?token=` consumes an emailed link (works signed-out); otherwise shows the pending screen: I've confirmed it / Resend / Wrong email address? / Sign out. Returns to `callbackUrl` once verified. After a token succeeds while signed in, the page refreshes the session cookie **once** (Continue is disabled until that finishes); `update()`'s transient `"loading"` status is treated as still signed in so the UI doesn't swap |
| `/account` | Account — profile, notification prefs, blocked members (unblock), sign out, delete (via header greeting) |
| `/settings/notifications` | Redirect → `/account#notifications` (legacy / List-Unsubscribe) |
| `/dashboard` | **Groups home** — list of user's groups; **group/your points**; **current betslip** legs (fixture, market, selection, odds); waiting status if you haven't picked |
| `/performance` | Cross-group stats (`DashboardStats`) — group filter dropdown, charts, share cards |
| `/admin` | **Admin** — platform metrics (admin role only) |
| `/admin/activity` | **Admin** — per-user web/mobile logins, visits, page/screen views, and last activity |
| `/admin/unverified` | **Admin** — unconfirmed-email accounts: fix email, resend link, remove (see [Email verification](#email-verification)) |
| `/admin/settlement` | **Admin** — settlement queue: locked rounds, overdue legs (3h+ after KO), manual settle + outcome correction |
| `/admin/results` | **Admin** — recent matches: override FT score (locks against feed), correct leg outcomes |
| `/admin/leaderboards` | **Admin** — group & player rankings by points |
| `/admin/competitions` | **Admin** — enable/disable competitions in leg picker |
| `/admin/odds` | **Admin** — Odds API diagnostics + **Warm odds cache now** (same job as cron) |
| `/groups/create` | Create group (auth required; legs-per-member picker) |
| `/groups/join` | Join group — **public**; signed-out shows Sign in / Sign up (keeps `?code=`); signed-in auto-joins when `?code=` present |
| `/groups/[id]` | **Round** tab — active-bet switcher, new-bet action, multi-leg picker, picks, lock, settle |
| `/groups/[id]/history` | **History** tab — every settled acca with fixtures, markets, outcomes |
| `/groups/[id]/leaderboard` | **Leaderboard** tab — ranked members + group stats/charts (`GroupStats`); former Performance content |
| `/groups/[id]/performance` | Redirects → `/groups/[id]/leaderboard` |
| `/groups/[id]/settings` | **Owner** — legs per member (all eligible open bets immediately) + maximum active bets (1–5) |

**Navigation:** Logo + **Social Group Betting** tagline (tagline hidden below `md`). Logo and **Home** → `/`. `AppNav` order: Home → About → Groups → Performance → Admin (admins) → **Blog** (rightmost). Below `md`, inline links collapse into `MobileNav` (hamburger) — signed-out: Home / About / Blog / Sign in / Sign up as peer links; signed-in adds **Account · {firstName}** → `/account`. Desktop greeting **Hi, {firstName}** → `/account` (notifications + sign out). Legacy `/settings/notifications` redirects to `/account#notifications`. Marketing pages use `SessionAwareMarketingHeader` (client `useSession`) so statically generated `/blog` still shows signed-in chrome. Inside a group, `GroupNav` tabs (Bet / Leaderboard / History / Chat / **Settings** for owners) share data via `GroupDataProvider` (fetched once in group layout; polls every 60s while acca locked). Chat unread counts appear on the Chat tab, which polls its permanent group thread every 20 seconds while visible.

**Group cards (web + mobile):** one active bet keeps the detailed current betslip. Two or more active bets switch to a compact, action-first overview: up to three **Bet #N** rows with Open / Locked / In play status, pick or settlement progress, the current member's missing-pick warning, and combined odds when available; additional bets collapse into **+N more**. `GET /api/groups` exposes `activeBets` summaries for mobile, and the server-rendered web dashboard uses the same shared display helpers.

**Open round UI:** current combined odds + **Compare bookmakers** podium (logos; 1st–3rd emphasised) from legs submitted so far.
**Locked round UI:** picks with per-leg outcomes as matches finish → **locked combined odds + Compare bookmakers** podium (captured at lock) → betslip CTA until the first result, then tracking only. Polls every 60s while locked. **History** tab lists all settled rounds.

---

## Results sources (consensus)

Spec: [specs/odds-and-results-sourcing.md](./specs/odds-and-results-sourcing.md) (Phases 1–2). `Match` stays the canonical result that settlement reads; each provider's latest reading is a `MatchObservation` row (`provider` = `football_data` | `api_football`, oriented to the Match's home/away).

1. **Link legs to Matches** — `ensureMatchesForLockedLegs()` gives every pending leg in a locked/settled round a `Match` (adopting one football-data created, by competition + kickoff ±3h + team names, or creating one keyed by `externalOddsId`). Outrights are skipped.
2. **football-data.org** (`syncAllCompetitionMatches`, free-tier codes only) — maps each fixture to a Match by `externalDataId`, else by kickoff + team names (`mapFixture`), else creates one; records an observation.
3. **API-Football** (`syncApiFootballResults`) — for Matches with locked legs and no API-Football observation: one `fixtures?date=` lookup per UTC date (all leagues, filtered by `apiFootballLeagueId`), `mapFixture` against kickoff ±3h + team names (static aliases e.g. Türkiye/Turkey, learned `TeamAlias` rows; ambiguous → no guess). Unmapped Matches retry hourly (`apiFootballCheckedAt`). Mapped fixtures are polled with `fixtures?ids=` (≤20 per request, includes statistics) from KO−10 min until finished, then every 15 min for 24h so stats corrections land.
4. **Consensus** (`resolveMatchConsensus` → `applyMatchConsensus`) writes `Match`:
   - `agreed` — all terminal feeds match on status + 90' score.
   - `single` — one terminal feed (the other is missing or still live) → settles normally.
   - `conflict` — terminal feeds disagree (score, or FINISHED vs POSTPONED) → Match score untouched, auto-settle **held**; amber warning in `/admin/results`.
   - `abstain` — no feed can give a 90' score (e.g. extra time without a regulation split) → held likewise.
   - Admin override (`scoreLocked`) always wins and releases a hold.
   Half-time, `wentToExtraTime` and `stats` (corners / yellow / red, API-Football only) are also written; `statsStableSince` resets whenever stats change.
5. **Corners markets** (`corners_1x2`, `corners_over_under_*`, `corners_handicap_*`, `team_corners__*`) settle from `Match.stats.corners` once the result is confirmed **and** stats have been unchanged for `STATS_CONFIRMATION_MS` (2h). Extra-time matches, missing stats and unmatched team-corners slugs stay pending for admin (bookmakers settle corners on 90', our stats cover the whole match). Cards and `to_qualify` legs remain admin-settled.

`/admin/results` shows each Match's per-source readings (status, 90' score, final/AET, corners, last change) plus "sources agree" / "went to extra time" tags. `/admin/competitions` shows each competition's active results feeds.

**API-Football budget:** Pro plan 7,500 requests/day. Typical matchday: one date lookup per new date + one request per 20 live/recently-finished Matches every 5 min — well under 1,000/day. Last seen remaining quota is logged by the cron and returned as `apiFootball.quotaRemaining`.

## Settlement

**System-only** (July 2026): group owners can no longer settle rounds — the owner manual-settle and owner auto-settle routes (`POST /api/rounds/[id]/settle`, `POST /api/rounds/[id]/auto-settle`) were removed. Settlement happens exclusively via the match-sync cron:

| Method | Route | Notes |
|--------|-------|-------|
| Auto (hands-off) | Via `POST /api/internal/sync-matches` | Cron sync → wait for FT score stability (1h unchanged, max 4h) → settle locked rounds when any leg loses **or** all legs are won/void; reconcile feed score corrections for 24h after FT; continue resolving pending legs on early-settled losses |
| Admin (escape hatch) | `POST /api/admin/rounds/[id]/settle` | Platform admin settles stuck locked rounds, or remaining pending legs after an early loss — see `/admin/settlement` |
| Admin score override | `PATCH /api/admin/matches/[id]` | Correct FT score, lock against feed overwrites, re-resolve/correct linked legs — see `/admin/results` |
| Admin outcome correction | `POST /api/admin/legs/[id]/correct-outcome` | Fix a wrong won/lost/void on locked or settled rounds (points delta + chat correction) |

**FT confirmation window.** When match sync first observes `FINISHED`, it stamps `Match.finishedAt` and `Match.scoreStableSince`. Auto-settle holds leg outcomes until the FT score has been **unchanged for** `RESULT_CONFIRMATION_MS` (1 hour, `packages/shared/src/constants.ts`), capped at `RESULT_CONFIRMATION_MAX_MS` (4 hours) from first FINISHED — so football-data.org can correct provisional scores (disallowed goals / VAR). Each feed score change resets `scoreStableSince` and restarts the 1h stability clock. During the wait the Match row keeps updating to the latest feed score. **After outcomes are written**, the same cron keeps reconciling for `RESULT_RECONCILE_MS` (24 hours): if the feed score later disagrees with a leg’s won/lost/void, outcomes and points are auto-corrected via `reconcileMatchLegOutcomes()` (chat correction + P/L delta) — no admin required. Admin score overrides set `scoreLocked` and confirm immediately. Existing FINISHED rows are backfilled so a deploy does not re-open the window.

Email and push notifications fire on **round locked**, **round settled**, and **pick reminders** (within 2h before first kickoff). Resend for email (`RESEND_API_KEY`, `EMAIL_FROM`); Expo Push API for mobile (`PushDevice` tokens). Per-user preferences at `/account` (web) and `(main)/account` (mobile). Deduped via `NotificationLog`; round-level `lockedNotificationSentAt` / `settledNotificationSentAt` set only when all members are satisfied (delivered or opted out). Failed lock/settle deliveries retried on `sync-matches` (5 min). Pick reminders cron: `POST /api/internal/round-reminders` every 15 min (Terraform). Notification times formatted in `Europe/London`. Emails only go to confirmed addresses (see [Email verification](#email-verification)). See [specs/notifications.md](./specs/notifications.md).

**Early settle on loss.** As soon as one leg is `lost`, the round settles: group scores −1 and concluded legs award member points under the per-leg rule (won → odds−1, lost → −1, void → 0). If no other open or locked bet remains, the next open round starts automatically; otherwise members continue through the existing active bets and can create another when the owner’s cap permits. Remaining legs stay `pending` until match sync (or admin) resolves them via `applyDeferredLegOutcome()` — still exactly-once (pending → outcome claim).

**Selection outcomes propagate across groups.** An outcome is a fact about a `(fixtureId, marketType, selectionId)`, not about one group's leg. When several groups back the same selection they get separate `Leg` rows, so admin manual settlement previously asked the same question once per group — and nothing prevented contradictory answers being stored for the same selection. `propagateSelectionOutcomes()` (`apps/web/src/lib/settlement/propagate-selection-outcome.ts`) applies each admin-entered outcome to every **other pending** leg on that selection, then `tryAutoSettleRound()` settles any round that is now fully resolved. Settled rounds route through `applyDeferredLegOutcome` (so deferred points are awarded); locked rounds use `persistResolvableLegOutcomes` — the same `pending → outcome` claim as the cron, so the `leg_result` chat message still posts exactly once. Scope is deliberately narrow: identical selection only, `locked`/`settled` rounds only (open rounds still lock at first kickoff), never overwrites a non-pending leg, and idempotent on re-run. Covered by `propagate-selection-outcome.test.ts` (requires local PostgreSQL).

**Exactly-once settlement.** `applyRoundSettlement()` validates settleability, then runs in a `prisma.$transaction` with an atomic claim — `round.updateMany({ where: { status: "locked" }, data: { status: "settled" } })`. Overlapping settle attempts (e.g. two cron runs) can't double-count points: the loser matches zero rows and throws `RoundNotSettleableError`, treated as a benign `skipped` no-op.

**System chat messages.** Round lifecycle events append `RoundMessage` system messages to the group's permanent Chat thread ([specs/group-chat.md](./specs/group-chat.md)): leg submitted/changed/removed (`/api/legs` routes), round locked (`claimAndLockRound`, after the `open → locked` claim + successful pricing), leg results (`persistResolvableLegOutcomes` / `applyDeferredLegOutcome`, inside a `pending → outcome` claim transaction), and round settled (`applyRoundSettlement`, inside the settle transaction after the `locked → settled` claim). Each retains nullable `roundId` context and displays its stable **Bet #N**. Message writes are gated on the same atomic claims as the events themselves, so retried or overlapping lock/settle runs never double-post — proven by race tests in `apps/web/src/lib/chat/exactly-once.test.ts` (`npm test --workspace=@tiki-acca/web`; requires local PostgreSQL).

**Lock triggers.** A round moves `open → locked` when **every member has submitted their `effectiveLegQuota` legs** (`Round.legsPerMember`, or `SOLO_MAX_LEGS` on a solo round), when a solo member **locks it manually** via `POST /api/rounds/[id]/lock`, or when the **earliest submitted leg kicks off** (partial accas — members under quota are excluded). `claimAndLockRound()` in `claim-lock-round.ts` atomically claims via `updateMany`, reprices, and emails; repricing failures revert to `open`. Kickoff locks run on each match-sync cron (5 min) and when loading `GET /api/groups/[id]`. **Reprice falls back to each leg’s stored odds** when live quotes are missing (fixture already kicked off / warmed cache miss) so kickoff locks don’t flap open↔locked. Loading a group with a full quota also retries lock. See [specs/round-deadline-lock.md](./specs/round-deadline-lock.md) and [specs/multi-leg-accas.md](./specs/multi-leg-accas.md).

**Lock is likewise atomic.** When two members submit the final legs at once, only one request reprices the acca (Odds API credits) and sends the lock email; repricing failures revert the round to `open`.

### Changing and removing picks (until first kickoff)

Members can change **their own leg** via `PATCH /api/legs/[id]` while the round is `open` **or** `locked`, up to the earliest kickoff among the round's legs. After the first match starts, edits return 403. Rules enforced server-side:

- Only the leg's owner may edit; pick is re-validated against live/mock odds like a fresh submit (competition enabled, selection exists, fixture not kicked off).
- Edited legs reset `matchId` and keep `outcome: "pending"`.
- **Locked rounds reprice**: after an edit, `lockRoundWithAccaPricing()` re-runs — combined odds, bookmaker rankings, and betslip links refresh at current prices for **all** legs. If repricing fails, the edit is rolled back (previous pick restored).
- Members can remove **their own leg** via `DELETE /api/legs/[id]` only while the round remains `open` and before its first kickoff. Locked/settled rounds reject removal. A replacement submission reuses the first available `legIndex`.
- UI: **Change** and **Remove** actions on the Round tab (web + mobile); removal requires confirmation and posts a `leg_removed` system chat message.

### Cron (internal)

| Route | Role |
|-------|------|
| `POST /api/internal/sync-matches` | Link locked legs to `Match` → football-data.org + API-Football observations → consensus `Match` result; reconcile recent FT score corrections → leg outcomes; locks open rounds at first kickoff; auto-settles locked rounds (incl. early loss); awards deferred legs on settled rounds; retries pending lock/settle notifications |
| `POST /api/internal/round-reminders` | Pick reminder emails/push (T−2h before kickoff) |
| `POST /api/internal/warm-odds-cache` | Refresh odds snapshots in DB |

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/settlement/auto-settle-round.ts` | Hands-off auto-settle + deferred pending legs on settled rounds |
| `apps/web/src/app/api/legs/[id]/route.ts` | Change/remove own leg (PATCH/DELETE) — cutoff, authorization, locked-round edit reprice |
| `apps/web/src/lib/admin/compute-settlement-queue.ts` | Locked + early-settled-pending queue + 3h overdue-leg flags |
| `apps/web/src/lib/admin/compute-admin-results.ts` | Recent matches for admin score override UI |
| `apps/web/src/components/admin/settlement.tsx` | Settlement queue UI + manual settle / correct outcome |
| `apps/web/src/components/admin/results.tsx` | Match score override + per-leg outcome correction |
| `apps/web/src/app/api/admin/rounds/[id]/settle/route.ts` | Admin manual settle (locked) or deferred leg resolve (settled) |
| `apps/web/src/app/api/admin/matches/[id]/route.ts` | Admin match score override (locks score, re-resolves legs) |
| `apps/web/src/app/api/admin/legs/[id]/correct-outcome/route.ts` | Admin correction of a resolved leg outcome |
| `apps/web/src/lib/settlement/resolve-round-outcomes.ts` | Match → leg outcomes (gated on FT confirmation); `persistResolvableLegOutcomes()` |
| `apps/web/src/lib/settlement/correct-leg-outcome.ts` | Points-aware outcome correction for locked/settled rounds |
| `apps/web/src/lib/settlement/apply-round-settlement.ts` | Atomic settle + `applyDeferredLegOutcome()` |
| `apps/web/src/lib/results/result-confirmation.ts` | `isMatchResultConfirmed` / score-stability confirmation helpers |
| `apps/web/src/lib/results/reconcile-match-legs.ts` | Feed score → leg outcome reconciliation (cron + admin override) |
| `apps/web/src/lib/results/override-match-score.ts` | Admin override + lock; delegates re-resolution to reconcile |
| `apps/web/src/lib/results/sync-matches.ts` | football-data.org → observations; maps fixtures onto existing Matches |
| `apps/web/src/lib/results/sync-api-football.ts` | API-Football mapping (date lookups) + polling (ids) → observations |
| `apps/web/src/lib/results/providers/api-football.ts` | API-Football client, status map, 90' score + stats reading |
| `apps/web/src/lib/results/ensure-leg-matches.ts` | Link pending locked legs to a `Match` (adopt or create) |
| `apps/web/src/lib/results/observations.ts` | `recordObservation` / `applyMatchConsensus` (respects `scoreLocked`; stamps `finishedAt` / `scoreStableSince` / `statsStableSince`) |
| `apps/web/src/lib/results/consensus.ts` | Pure consensus rules (agreed / single / conflict / abstain) |
| `apps/web/src/lib/results/map-fixture.ts` + `team-names.ts` + `team-alias-store.ts` | Fixture mapping by kickoff + team names; static + learned aliases |
| `apps/web/src/lib/notifications/dispatch.ts` | Central notification dispatcher |
| `apps/web/src/lib/notifications/send-pick-reminders.ts` | Pick reminder cron logic |
| `apps/web/src/lib/notifications/retry-pending-round-notifications.ts` | Retry failed lock/settle notifications |
| `apps/web/src/lib/notifications/round-notifications.ts` | Lock / settle / reminder payloads |
| `apps/web/src/lib/notifications/channels/` | Email + Expo push adapters |
| `apps/web/src/lib/notifications/email.ts` | Resend client (HTML + plain text + `List-Unsubscribe`) |
| `apps/web/src/lib/notifications/templates.ts` | Branded lock / settle / reminder copy + HTML |
| `apps/web/src/lib/notifications/email-layout.ts` | Turf Green email shell, logo, CTAs |
| `apps/web/public/brand/email-logo.png` | Triangle rondo disc for email clients |
| `apps/web/src/components/notification-settings.tsx` | Web preferences UI |
| `apps/mobile/src/notifications/register.ts` | Push permission + token registration |
| `GET/PATCH /api/user/notification-preferences` | User notification toggles |
| `POST/DELETE /api/user/push-token` | Mobile Expo push token |
| `apps/web/src/lib/results/football-data.ts` | football-data.org fetch, team matching, **regulation (90 min) scores** (null after extra time without `regularTime`) |
| `apps/web/src/lib/results/match-store.ts` | DB lookup for auto-settle; `alignResultToLeg` swaps goals / HT / corners to the leg's home/away |
| `apps/web/src/lib/results/resolve-leg.ts` | Market → outcome logic (90-minute score; corners from confirmed stats) |
| `apps/web/src/lib/settlement/apply-round-settlement.ts` | Transactional settle: atomic `locked → settled` claim, points/P&L, `RoundNotSettleableError` |

---

## Admin & analytics

→ Full spec: [specs/platform-admin.md](./specs/platform-admin.md)

Platform admins (`User.role = admin`) see an **Admin** area including Overview, Activity, Settlement, Results, Leaderboards, Competitions, and Odds.

**Granting admin:** set `ADMIN_EMAILS` (comma-separated) in env. Matching users promoted on sign-up or sign-in. Session role refreshes from DB on each request (no re-login needed).

### Overview (`/admin`)

| Metric | Source |
|--------|--------|
| Players, groups, picks | `User`, `Group`, `Leg` counts |
| Accas formed | Rounds with status `locked` or `settled` |
| Successful accas | Settled rounds with `profitLossGbp > 0` |
| Sign-ups (7d/30d) | `User.createdAt` |
| Logins (7d/30d) | `AnalyticsEvent` type `login` |
| Page views (7d/30d) | `AnalyticsEvent` type `page_view` |

`/admin/unverified` lists accounts that haven't confirmed their email, with fix-email / resend / remove actions — see [Email verification](#email-verification).

`/admin/activity` lists every customer with searchable, sortable, paginated lifetime counts split by web and mobile: logins, 30-minute visits, page/screen views, legacy unknown-channel logins, joined date, last login, and last active. The channel filter limits the list to customers with activity on that channel.

### Leaderboards (`/admin/leaderboards`)

| Leaderboard | Ranked by |
|-------------|-----------|
| Groups | `groupNetPoints()` (group acca points — same as group Performance); columns: name, **owner**, members, points, W/L record. Marketing demo group (`DEMO24` / `@demo.tikiacca.com` owner) excluded |
| Players | `User.totalPoints` (all groups); **all registered users** listed (0 pts if no groups), except `@demo.tikiacca.com` marketing accounts |

Admin-only for now; public rollout planned when user base grows.

### Analytics events

`AnalyticsEvent` table: `sign_up`, `login`, `visit`, `page_view`, `app_open`, `email_verified`. New events carry `channel: web | mobile`; historical page views are backfilled as web, while pre-migration logins remain null/legacy because their original channel cannot be recovered. Global authenticated trackers capture App Router navigation and mobile route/foreground activity. A visit begins after 30 minutes without page/screen activity; PostgreSQL advisory locking prevents duplicate starts across tabs or instances. Paths exclude query strings and normalise dynamic group/blog IDs. No IP address, device fingerprint, referrer, or third-party analytics identifier is stored.

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/auth.config.ts` | Edge-safe Auth.js (middleware) |
| `apps/web/src/lib/auth.ts` | Credentials sign-in, JWT role refresh |
| `apps/web/src/lib/admin/auth.ts` | `requireAdmin`, `ADMIN_EMAILS` promotion |
| `apps/web/src/lib/admin/compute-admin-stats.ts` | Overview aggregates |
| `apps/web/src/lib/admin/compute-platform-leaderboards.ts` | Leaderboard queries (excludes marketing demo accounts) |
| `apps/web/src/lib/admin/demo-accounts.ts` | `@demo.tikiacca.com` / `DEMO24` filters for admin leaderboards |
| `apps/web/src/lib/analytics.ts` | `recordAnalyticsEvent` |
| `apps/web/src/components/admin/page-shell.tsx` | Admin layout + nav |
| `apps/web/src/components/admin/stats.tsx` | Overview UI |
| `apps/web/src/components/admin/platform-leaderboards.tsx` | Leaderboard tables |
| `apps/web/src/components/stake-profit.tsx` | Points → profit converter |
| `GET /api/admin/stats` | JSON overview (admin session) |
| `GET /api/admin/leaderboards` | JSON leaderboards (admin session) |
| `PATCH /api/admin/unverified-users/[id]` | Correct an unconfirmed user's email `{ email }` (same address = resend) and send a new link |
| `DELETE /api/admin/unverified-users/[id]` | Remove an unconfirmed account (`{ result: "deleted" \| "anonymised" }`) |

**Analytics coverage:** global authenticated web/mobile trackers include client navigation and group-tab changes. Pre-migration data remains partial; see Known limitations and the platform-admin spec.

---

## Stats

Computed on read from settled rounds. No materialised stats tables.

Member summary **best / worst leg** = highest / lowest decimal odds across the member's legs (not round points). Category **best / worst** (competition, bet type, team) on group member breakdown **and** `/performance` = highest / lowest **average points per individual settled leg** (min 3 legs in at least two categories). Pick win rate is won / (won + lost) on that member's legs only — independent of whether the group acca won.

| Route | Purpose |
|-------|---------|
| `GET /api/groups/[id]/stats` | Group summary + cumulative points chart |
| `GET /api/groups/[id]/members/[userId]/stats` | Member breakdown, favourites, best/worst |
| `GET /api/user/stats` | Cross-group performance summary + chart + individual insights (competition / bet type / team) |

| Path | Role |
|------|------|
| `apps/web/src/lib/stats/compute-group-stats.ts` | Group summary metrics |
| `apps/web/src/lib/stats/compute-member-stats.ts` | Member breakdown |
| `apps/web/src/lib/stats/compute-user-stats.ts` | Cross-group user stats + personal competition/bet-type/team insights |
| `apps/web/src/lib/stats/compute-member-chart.ts` | Multi-member chart series |
| `apps/web/src/lib/stats/helpers.ts` | Shared helpers (favourites, best/worst, live net points); chart labels `formatBetAxisLabel` + `formatSettledDateLabel`; `CHART_ORIGIN_LABEL` (`Start`) at 0 pts |
| `apps/web/src/components/group/stats.tsx` | Group performance UI (Recharts) |
| `apps/web/src/components/dashboard-stats.tsx` | Cross-group performance UI (`/performance`) |
| `apps/web/src/components/share-card.tsx` | Shareable performance image (PNG) + copy text fallback |
| `apps/web/src/lib/share/render-performance-image.ts` | Canvas renderer for branded share cards |

---

## Environment variables

### Local (`apps/web/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL |
| `AUTH_SECRET` | Yes | Auth.js + verification of legacy mobile JWTs during rollout |
| `NEXTAUTH_URL` | Yes | e.g. `http://localhost:3000` |
| `ODDS_API_KEY` | No | Live odds; omit = mock |
| `ODDS_API_SPORT` | No | Default `soccer_fifa_world_cup` (fallback only) |
| `FOOTBALL_DATA_API_KEY` | No | Match sync (free-tier competitions) |
| `API_FOOTBALL_KEY` | No | Second results source + corners stats; required for API-Football-only competitions (League One/Two, Nations League, cups, UEFA qualifiers) to auto-settle |
| `FOOTBALL_DATA_CACHE_TTL_MS` | No | In-memory cache TTL for football-data fetches (default 60s; bypassed on cron sync) |
| `ODDS_API_CACHE_TTL_MS` | No | DB snapshot TTL for odds (code default 30 min; production 7 h — must exceed the 6 h warm cron when `ODDS_DB_ONLY=true`) |
| `OUTRIGHTS_ENABLED` | No | Season-long outrights; off unless `"true"`. Dormant by design — [ODDS_PROVIDERS.md](./ODDS_PROVIDERS.md) |
| `ESTIMATED_ODDS_ENABLED` | No | Median-backfill estimates for thin bookmaker tables; off unless `"true"`. Deploy-level gate — an admin runtime toggle (`/admin/odds`) additionally governs it once this is on. Dormant by design — [specs/estimated-odds-fill.md](./specs/estimated-odds-fill.md) |
| `ESTIMATED_ODDS_MARGIN` | No | Haircut: estimate = median × (1 − margin). Default `0.05`; clamped to `[0.01, 0.5]`; ≤0 falls back to default |
| `ESTIMATED_ODDS_MIN_REAL_QUOTES` | No | Minimum real quotes required before a selection is backfilled (default `2`) |
| `ESTIMATED_ODDS_SKIP_AT` | No | Skip filling once real-quote count reaches this threshold (default `4`) |
| `ODDS_DB_ONLY` | No | When `true`, bulk fixtures + core tiers read DB only (cron must refresh). Specials (corners & cards) still live-fetch on miss |
| `ODDS_WARM_CORE_WITHIN_HOURS` | No | Cron prefetches core extended markets within N hours of kickoff (default 72) |
| `CRON_SECRET` | No | Bearer token for `/api/internal/*` cron routes |
| `RESEND_API_KEY` | No (prod: **yes**) | Email via Resend — notifications and **email verification links** (without it in production nobody can confirm their email; locally the link is logged to the console) |
| `EXPO_ACCESS_TOKEN` | No | Optional Expo Push API auth (higher rate limits) |
| `EMAIL_FROM` | No | Sender address (required with `RESEND_API_KEY`) |
| `ADMIN_EMAILS` | No | Comma-separated emails granted platform admin |
| `ORIGIN_AUTH_SECRET` | No | Blocks direct-to-Cloud-Run traffic; must match Cloudflare Transform Rule header — [DEPLOYMENT.md](./DEPLOYMENT.md#ddos--abuse-protection) |

### Production (GitHub Actions → Cloud Run)

Secrets: `DATABASE_URL`, `AUTH_SECRET` (Terraform Secret Manager + `deploy.yml`), `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `API_FOOTBALL_KEY`, `RESEND_API_KEY` (optional), GCP deploy secrets. `CRON_SECRET` is in Secret Manager (Terraform); optional GitHub secret only to seed Terraform without rotating.

Env vars on Cloud Run: `NEXTAUTH_URL`, `EMAIL_FROM`, `ADMIN_EMAILS` (from GitHub secret), `ODDS_API_SPORT`, `ODDS_API_REGIONS=uk`, etc. See `.github/workflows/deploy.yml`.

---

## Database (Prisma)

Core models: `User`, `Group`, `GroupMember`, `Round`, `Leg`, `Match`, `MatchObservation`, `TeamAlias`, `AnalyticsEvent`, `CompetitionSetting`, `RoundMessage`, `MessageReaction`.

- `RoundMessage` — group-scoped permanent chat: required `groupId`, nullable `roundId` for lifecycle-event Bet context, user banter (`kind: "user"`) + append-only system messages (`kind: "system"`, `eventType`: `leg_submitted | leg_changed | leg_removed | round_locked | leg_result | round_settled`; `legId` set on active pick announcements so the betslip row can mirror reactions). User posts run through shared `containsProfanity` (same list as names/groups). Existing messages were backfilled by `20260718200000_group_scoped_chat`; its trigger derives `groupId` for old-revision writes during a rolling deploy, with `20260718201000_group_chat_rolling_compat` ensuring the trigger on existing development databases. Legs submitted before group chat shipped may lack announcements; backfill with `npm run db:maintenance -- backfill-leg-announcements --execute` (preview first).
- `MessageReaction` — emoji reactions on messages, unique per `(messageId, userId, emoji)`. The bar shows **only used emoji chips**; a muted **React** / **+** opens a viewport-level picker (quick picks 🔥😂💀👀🫡🍀, then more). The API validates any single Unicode emoji. Pick rows mirror the latest `leg_submitted` / `leg_changed` message for their `legId`.
- `GroupMember.lastReadMessageAt` — group-wide unread cursor; dashboard cards and dedicated Chat tabs show unread counts.
- `NotificationPreference.pushChat` — chat push opt-in (default on). User messages notify other members at most once per ten-minute group bucket; active 20-second thread polling suppresses foreground pushes.

- `User.firstName` / `User.lastName` — collected at sign-up; header greeting uses first name only (`lib/user-display.ts`).
- `User.name` — full display name (`firstName lastName`) for leaderboards, picks, emails.
- `User.emailVerifiedAt` — null until the user confirms their email (or resets their password); gates app/API use. See [Email verification](#email-verification).
- `EmailVerificationToken` — hashed one-time confirm links (`tokenHash` unique, `email` it was sent to, `expiresAt`, `usedAt`); cascades on user delete.
- `User.role` — platform role: `user` (default) or `admin` (via `ADMIN_EMAILS`).
- `AnalyticsEvent` — first-party customer activity (`type`, `userId?`, `channel?`, normalised `path?`, `createdAt`), indexed by user/channel/time. The authenticated ingest route derives user and channel server-side.
- `Group.legsPerMember` — 1–3 (default 1); owner create / Settings.
- `Group.maxActiveBets` — owner-selected 1–5 (default 1); counts `open` + `locked` rounds. Above 1, any member may create a bet if below the cap and every existing open bet has a leg.
- `Round.betNumber` — stable group-scoped `Bet #N` display number; backfilled for existing rounds.
- `Round.legsPerMember` — set at round open; owner Settings updates every eligible `open` round before first kickoff. Locked / kickoff-in-progress rounds keep their quota.
- `Round.unlimitedLegs` — **solo accas**. Set `true` at round open when the group has exactly one member (both `openRound` and `createAdditionalRound`). Such a round uses `SOLO_MAX_LEGS` (10, `packages/shared/src/constants.ts`) as its quota instead of `legsPerMember`, and can be locked manually. **Handover on join:** when a second member joins, `POST /api/groups/join` clears the flag on every `open` round of that group in the same transaction (`convertSoloRoundsToGroup`, `apps/web/src/lib/rounds/convert-solo-rounds.ts`). The round reverts to its snapshot `legsPerMember` for both members; legs the solo member already submitted stand even if they exceed it (`allMembersFilledQuota` tests `>=`), so the acca locks once the new member submits through the ordinary leg path. Without this the round would allow a `2 x SOLO_MAX_LEGS` acca — past the selection limit bookmakers accept, which is the reason the cap exists — and would let the joiner manually lock the original member out. `locked`/`settled` rounds keep the flag as a record; neither the quota nor the manual-lock route consults it once a round leaves `open`. Owner Settings skips solo rounds entirely (they are filtered out of `applicableOpenRounds`), so a `legsPerMember` change can neither re-quota nor lock one. Resolve the quota through `effectiveLegQuota(round)` (`packages/shared/src/legs-quota.ts`) — never read `legsPerMember` directly. See [specs/solo-unlimited-legs.md](./specs/solo-unlimited-legs.md).
- Up to `legsPerMember` legs per user per round (`@@unique([roundId, userId, legIndex])`).
- **Fixture uniqueness rule:** new/edited picks allow only one leg per `fixtureId` in a round, regardless of market, because same-match combinations require correlation-adjusted bet-builder pricing unavailable from the current feed. See `packages/shared/src/market-conflicts.ts`. Enforced on `POST`/`PATCH` `/api/legs`; web/mobile pickers disable occupied fixtures. Existing settled history is unchanged. The older `fix-duplicate-markets` maintenance remains available for historical same-market-family cleanup.
- Leg stores `legIndex` + fixture snapshot: teams, kickoff, `competitionId` (slug), `competition` (display name), optional `matchId` FK, market, odds, bookmaker, `betslipUrl`, `bookmakerLinks` JSON, outcome.
- `Match` — canonical result per fixture (`externalDataId` from football-data.org, `externalOddsId` from The Odds API); consensus fields `resultSource`, `homeGoalsHt`/`awayGoalsHt`, `wentToExtraTime`, `stats` + `statsStableSince`, `apiFootballCheckedAt`.
- `MatchObservation` — one row per `(matchId, provider)`: that feed's status, 90' / final / HT score, extra time, stats, `changedAt`. Unique on `(provider, externalId)`.
- `TeamAlias` — learned team-name equivalences (`source`: `auto` | `admin`) used by fixture mapping.
- `Round.accaBookmakerRankings` — JSON array of ranked bookmakers at lock.
- `CompetitionSetting` — `competitionId` slug + `enabled` flag for leg-picker visibility (seeded: World Cup on, every other competition off; new catalogue entries are inserted off).
- `PlatformSetting` — generic admin-managed key/value runtime toggle store; currently one row (`estimated_odds_enabled`) gating the estimated-odds fill at runtime alongside `ESTIMATED_ODDS_ENABLED`.
- Groups always retain at least one open or locked round. At the default cap of 1, settlement opens the next automatically. At higher caps, members create additional bets explicitly; PostgreSQL advisory locks make cap/empty-bet checks atomic. Legacy groups without an active round get one on next load.
- `Round.lockedNotificationSentAt` / `settledNotificationSentAt` — email dedup.

Schema: `packages/database/prisma/schema.prisma`

Recent migrations include `20260923120000_email_verification`, `20260718190000_concurrent_group_bets` and `20260718193000_concurrent_group_bets_constraints`.

---

## API routes (web)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/competitions` | Session | Enabled competitions for leg picker |
| `GET /api/fixtures` | Session | List fixtures (`?competition=` required) |
| `GET /api/fixtures/[id]/markets` | Session | Extended markets (`?competition=` required) |
| `POST /api/legs` | Session | Submit leg (rejects any second leg on the same fixture — 409) |
| `PATCH /api/legs/[id]` | Leg owner | Edit own pick until first kickoff (locked rounds reprice; one-leg-per-fixture rule) |
| `DELETE /api/legs/[id]` | Leg owner | Remove own pick while round is open and before first kickoff |
| `POST /api/rounds/[id]/lock` | Member of a **solo** round | Lock a solo acca on demand (needs `unlimitedLegs`, `open`, ≥1 leg). 403 on multi-member rounds — a manual lock there would lock other members out |
| `GET /api/groups` | Session | Groups list + single-bet `activeLegs` + compact multi-bet `activeBets` summaries + yourLeg / yourLegCount + chat unread count |
| `POST /api/groups` | Session | Create group (`name`, optional `legsPerMember` 1–3 and `maxActiveBets` 1–5) |
| `PATCH /api/groups/[id]` | Owner | Update `legsPerMember` and/or `maxActiveBets`; lower caps preserve existing bets and block creation until capacity returns |
| `POST /api/groups/[id]/rounds` | Member | Create another open bet when owner cap >1, below cap, and no empty open bet exists |
| `POST /api/internal/sync-matches` | `CRON_SECRET` | Sync football-data.org + API-Football → `Match` (consensus), lock, auto-settle |
| `POST /api/internal/warm-odds-cache` | `CRON_SECRET` | Refresh odds DB snapshots |
| `GET /api/groups/[id]` | Member | Group + all `activeRounds` (round-scoped betslip data) + compatibility `activeRound` + recent settled bets + latest active-leg announcements/reactions + chat unread count |
| `GET /api/groups/[id]/history` | Member | Full settled bet history (fixtures, markets, outcomes) |
| `GET /api/groups/[id]/stats` | Member | Group summary stats + chart series |
| `GET /api/groups/[id]/members/[userId]/stats` | Member | Member breakdown + favourites |
| `GET /api/user/stats` | Session | Cross-group performance stats |
| `GET/PATCH /api/user/notification-preferences` | Session | Notification toggles |
| `POST /api/analytics/events` | Session / mobile bearer | Record an authenticated page/screen view or mobile foreground event; derives channel and 30-minute visits server-side |
| `POST /api/auth/sign-up` | Public (rate-limited) | Create account (strict email format + MX check); sends confirm link; returns `verificationEmailSent` |
| `POST /api/auth/verify-email` | Public (20/hour/IP) | Consume `{ token }` from an emailed link; marks the user verified |
| `GET /api/auth/verify-email/status` | Session / mobile bearer (unverified OK) | `{ email, emailVerified }` |
| `POST /api/auth/verify-email/resend` | Session / mobile bearer (unverified OK, 3/hour) | Send a new link; `{ onlyIfNonePending: true }` skips if an unexpired link exists |
| `POST /api/auth/verify-email/change-email` | Session / mobile bearer (unverified OK, 5/hour) | Fix a mistyped address `{ email, password }` — unverified accounts only; sends a new link |
| `POST /api/auth/mobile/sign-in` | Public (rate-limited) | Create revocable persistent mobile session (response `user.emailVerified`) |
| `POST /api/auth/mobile/refresh` | Mobile bearer | Upgrade a valid legacy JWT to a persistent session (persistent tokens pass through) |
| `POST /api/auth/mobile/sign-out` | Mobile bearer | Revoke the current device session |
| `GET/POST /api/groups/[id]/messages` | Member | Cursor-paginated permanent group thread (`before`/`after`, latest pick announcements included) / post group-wide text (500 chars, profanity filter, 10/min) |
| `GET/POST /api/rounds/[id]/messages` | Member | Compatibility alias for older clients; resolves to the containing group thread |
| `DELETE /api/messages/[id]` | Author or group owner | Soft-delete a user message (body becomes `Message deleted`) |
| `POST /api/messages/[id]/reactions` | Member | Toggle one validated Unicode emoji reaction |
| `POST/DELETE /api/user/push-token` | Session / mobile bearer | Expo push token |
| `POST /api/internal/round-reminders` | Cron | Pick reminder dispatch |
| `GET /api/admin/stats` | Admin | Platform summary metrics |
| `GET /api/admin/leaderboards` | Admin | Group + player point rankings |
| `GET /api/admin/competitions` | Admin | All competitions + enabled flags |
| `PATCH /api/admin/competitions` | Admin | Enable/disable competition for users |
| `POST /api/admin/rounds/[id]/settle` | Admin | Manual settle (escape hatch for stuck rounds) |
| `PATCH /api/admin/matches/[id]` | Admin | Override match score, lock against feed, re-resolve legs |
| `POST /api/admin/legs/[id]/correct-outcome` | Admin | Correct a wrong leg outcome (points delta) |
| `GET /api/admin/odds-diagnostics` | Admin | Probe Odds API pipeline (`?competition=`) |
| `POST /api/admin/warm-odds-cache` | Admin | Manually run odds warm (same as cron; uses credits) |
| `GET /api/health` | Public | Health check (+ `odds: configured|missing`) |

---

## Known limitations

1. **Results coverage:** Free-tier football-data.org competitions have two sources (consensus); League One, League Two, CL Qualification, Europa League, Carabao Cup, Nations League and FA Cup have **API-Football only** — without `API_FOOTBALL_KEY` they fall back to manual settlement in `/admin/settlement`. A single source still settles (`single`), so a wrong API-Football score on those competitions is caught only by the 24h reconcile or an admin. Cards and `to_qualify` legs, and corners legs on extra-time matches, are always admin-settled. Legs placed before this shipped have no `Match` until the next cron links them. EPL/Championship may be empty off-season.
2. **Settlement is system-only** — auto-settle runs after match sync (every 5 min); leg outcomes update once a FINISHED score has been stable for 1h (or immediately after an admin score lock), with automatic reconciliation for 24h if the feed later corrects the score; round settles when **any leg loses** or **all legs are won/void**. Remaining legs on an early loss keep resolving via `applyDeferredLegOutcome()`. Owners cannot settle (routes removed July 2026). Overlapping settle attempts are safe — transactional, exactly-once via an atomic `locked → settled` claim (see [Settlement](#settlement)). Rounds the system cannot resolve are handled by admins via the **settlement queue** (`/admin/settlement`) — pending legs 3h+ after kickoff (including leftovers after early settle) are flagged for intervention. Wrong FT scores: usually self-heal via reconcile; escape hatch is **Admin → Results** to override and lock, or correct individual outcomes.
3. **Email** requires Resend setup (`RESEND_API_KEY`, `EMAIL_FROM`); notifications are skipped if unset, but **verification links are required in production** — without Resend, new and existing users are stuck at `/verify-email`.
4. **Auto-settle requires synced `Match` rows** — 5-min cron or manual `POST /api/internal/sync-matches`.
5. **Cross-competition acca** — often no single bookmaker; best-per-leg odds locked at submission; per-leg deeplinks when Odds API provides them.
6. **Betslip deeplinks** — selection/event links from Odds API (`includeLinks`); hubs only as labelled last resort. **No one-click full multi-leg betslip** for most UK books — CTA opens first available pick; users add remaining legs via per-leg Open. Mock mode has hubs only.
7. **The Odds API quota** — credits = `markets × regions`. Cron warm: **3** bulk + **5 × N** core per enabled competition every 6 h (`N` = fixtures within `ODDS_WARM_CORE_WITHIN_HOURS`, default 72). User “specials” tier = **7** per fixture on demand only (allowed even when `ODDS_DB_ONLY=true`, because specials are not cron-warmed). Set `ODDS_DB_ONLY=true` so bulk/core user traffic does not call the API. See [DEPLOYMENT.md](./DEPLOYMENT.md#the-odds-api--calls-credits--cron).
8. **Terraform CI** needs `storage.objectAdmin` on the deploy SA for the GCS state bucket. If CI fails with `storage.objects.list` denied, grant bucket access once (see [infra/terraform/README.md](../infra/terraform/README.md#terraform-ci-state-bucket-access)), then re-run the workflow. `deploy.yml` bootstraps `CRON_SECRET` in Secret Manager from the GitHub secret when missing.
9. **Odds snapshots in PostgreSQL** — shared across Cloud Run instances; refreshed by `POST /api/internal/warm-odds-cache` (Cloud Scheduler job in Terraform) or admin **Warm odds cache now** on `/admin/odds`. Set `ODDS_DB_ONLY=true` so bulk/core user routes never burn API credits (specials still on-demand). In-memory cache remains for quota block/snapshot and football-data only.
10. **Mobile app** — Native app code complete, feature parity across iOS/Android (single codebase, no platform forks). **iOS live in App Store Connect** (submitted, build 5). **Android** built and ready (Firebase push wired up) but not yet submitted — blocked on Play Console ID verification, see [ANDROID_LAUNCH.md](../apps/mobile/ANDROID_LAUNCH.md). Dev testing: Expo Go or `expo run:ios --device` ([DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md)); friend distribution via [FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md). Leg-edit parity shipped (same "Change my pick" flow as web). Admin pages are web-only by design. Web and mobile share their data layer (`@tiki-acca/client`), Bet-tab view logic (`deriveRoundView`) and copy — see [specs/mobile-apps.md](./specs/mobile-apps.md#reducing-duplicated-effort-and-artifacts).
11. **Auth JWT** — middleware uses edge-safe `auth.config.ts` (no Prisma); `auth.ts` refreshes `role`, `email` and `isEmailVerified` from DB on each session update. Middleware can therefore lag one request behind a verification done elsewhere; the verify page calls `update()` to re-issue the cookie.
12. **Chat realtime** — the permanent group thread polls every 20 seconds while the Chat tab is visible; no WebSocket/SSE, typing indicators, read receipts, media, or reaction notifications in v1. Chat push needs Expo/APNs/FCM setup on a physical device.
13. **Concurrent-bet notification links** — reminder/lock/settle payloads carry `roundId`, but current web/mobile group URLs do not preselect that bet; the user lands on the group’s default active bet and can switch manually.
14. **Analytics coverage boundary** — complete authenticated web/mobile navigation and visit tracking starts with migration `20260718213000_customer_activity_tracking`. Earlier identified web page views remain available, but older login events cannot be split reliably between web and mobile and appear as **Legacy logins**.

## Production checklist (operators)

- [x] `ODDS_API_KEY` in GitHub secrets
- [x] `FOOTBALL_DATA_API_KEY` in GitHub secrets
- [ ] `API_FOOTBALL_KEY` in GitHub secrets (Pro plan; passed to Cloud Run by `deploy.yml`)
- [x] `CRON_SECRET` in Secret Manager + Cloud Scheduler jobs (`sync-matches`, `warm-odds-cache`) via Terraform
- [x] `NEXTAUTH_URL=https://www.tikiacca.com`
- [x] Cloudflare Worker + www redirect configured
- [ ] `ORIGIN_AUTH_SECRET`: Cloudflare Transform Rule (`x-origin-auth`) + GitHub secret — [DEPLOYMENT.md](./DEPLOYMENT.md#ddos--abuse-protection)
- [ ] Cloudflare rate-limiting rule on `/api/auth/*` (free tier: 1 rule)
- [x] `RESEND_API_KEY` + `EMAIL_FROM` in GitHub (required — email verification; also email notifications)
- [x] `ADMIN_EMAILS` in GitHub secrets + passed to Cloud Run via `deploy.yml`

## GCP cost notes

Cloud SQL is typically **~90%** of GCP forecast. Current Terraform defaults: `db-f1-micro`, zonal, Enterprise edition, PITR enabled in prod. Cloud Run `min_instances = 0`.

Options to reduce spend: verify instance tier in console, disable PITR if acceptable, reduce backup retention, or migrate to Neon/Supabase. See [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization).

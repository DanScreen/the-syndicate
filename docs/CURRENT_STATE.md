# Current state (as-built)

Last updated July 2026. **This file is the source of truth for agents — update when you ship.**

Production: **https://www.the-syndicate.uk** (apex → 301 to www via Cloudflare).

Mobile (`apps/mobile/`) is **paused** — web only.

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

Omit `ODDS_API_KEY` for mock fixtures. Add `FOOTBALL_DATA_API_KEY` + `CRON_SECRET` to test match sync locally. Set `ADMIN_EMAILS` to enable the Admin tab.

### Deploy

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`): build → `db:migrate:deploy` → Cloud Run.

Match sync + odds warm: Cloud Scheduler (Terraform) → `POST /api/internal/sync-matches` (every 5 min UTC) and `POST /api/internal/warm-odds-cache` (every 6 h UTC) with Bearer `CRON_SECRET` from Secret Manager. See [DEPLOYMENT.md](./DEPLOYMENT.md).

### Code map

| Subsystem | Path |
|-----------|------|
| API routes | `apps/web/src/app/api/` |
| Shared schemas/types | `packages/shared/src/` |
| Prisma schema | `packages/database/prisma/schema.prisma` |
| Odds | `apps/web/src/lib/odds/` |
| Settlement | `apps/web/src/lib/settlement/`, `apps/web/src/lib/results/` |
| Stats | `apps/web/src/lib/stats/` |
| Notifications | `apps/web/src/lib/notifications/` |
| Auth | `apps/web/src/lib/auth.ts`, `apps/web/src/lib/auth.config.ts` |
| Settlement (auto) | `apps/web/src/lib/settlement/auto-settle-round.ts` |
| Round lifecycle | `apps/web/src/lib/rounds/open-collecting-round.ts` |
| Group UI | `apps/web/src/components/group-ui.tsx`, `group-stats.tsx` |
| App navigation | `apps/web/src/components/app-nav.tsx`, `group-nav.tsx`, `header.tsx` |
| Logo & marketing | `apps/web/src/components/logo.tsx`, `components/marketing/`, `lib/marketing-content.ts` |
| Brand archive | `apps/web/src/lib/brand/archive.ts`, `logo-alternatives.tsx` (unused alternatives) |
| Group layout | `apps/web/src/app/groups/[id]/layout.tsx`, `group-layout-client.tsx`, `context/group-data.tsx` |
| Scoring | `packages/shared/src/scoring.ts` |
| Competitions catalogue | `packages/shared/src/competitions.ts` |
| Platform admin | `apps/web/src/lib/admin.ts`, `lib/admin/`, `lib/competitions/settings.ts`, `app/admin/`, `components/admin-*` |
| Analytics | `apps/web/src/lib/analytics.ts`, `components/analytics/page-view.tsx` |

### What's next (July 2026)

See [ROADMAP.md](./ROADMAP.md) → **Next — backlog**. MVP shipped; validate with real users first.

---

## What works today

| Area | Status |
|------|--------|
| Auth (email/password, Auth.js JWT sessions) | ✅ |
| Groups, invite codes, join links (`?code=`), no member cap | ✅ |
| Always-open rounds (auto-created with group; next opens on settle) | ✅ |
| Rounds: collecting → locked → settled | ✅ |
| Live odds ([The Odds API](https://the-odds-api.com/)) + mock fallback | ✅ |
| Markets: h2h, totals (dynamic lines), spreads*, BTTS, double chance, correct score, corners/cards† | ✅ |
| Per-leg competition picker (admin-controlled; World Cup live by default) | ✅ |
| Leg picker: best odds only per selection | ✅ |
| Acca lock: best combined bookmaker across all legs | ✅ |
| Acca bookmaker rankings (best odds first, stored at lock) | ✅ |
| Real bookmaker betslip deeplinks (The Odds API) | ✅ |
| Match table + football-data.org sync cron | ✅ |
| Hands-off auto-settle (5-min cron, progressive leg outcomes) | ✅ |
| Email notifications (round locked / settled) | ✅ |
| Manual settle + auto-settle (owner-triggered) | ✅ |
| Unit-stake points + leaderboard | ✅ |
| Group stats summary + cumulative points chart | ✅ |
| Member stats breakdowns + multi-member chart | ✅ |
| Dashboard cross-group stats + share cards | ✅ |
| Split app layout (Groups / Performance nav; group tabs) | ✅ |
| Platform admin dashboard + leaderboards (`/admin`) | ✅ |
| Product analytics (logins, signups, page views) | ✅ |
| Marketing site (homepage, about, Turf Green + Acca stack logo) | ✅ |
| Points-first stats UX + stake → profit converter | ✅ |
| Locked round UX: picks first, locked odds only (no bookmaker comparison), in-progress leg results | ✅ |
| Round history, progress UI, landing/SEO | ✅ |

\*Asian handicap only from exchange bookmakers in current World Cup UK feed — filtered out; handicap UI empty for those fixtures.

---

## Scoring

**Unit-stake leg points** in `packages/shared/src/scoring.ts`:

| Outcome | Points |
|---------|--------|
| Won | `odds − 1` |
| Void | `0` |
| Lost | `−1` |

Examples: win @ 2.50 → +1.50; loss → −1.00.

**Stats compute from outcome + odds** via `legPointsForOutcome()` — not stale `pointsAwarded` (backfilled in migration `20260710000000_backfill_unit_stake_points`).

**Points-first UX:** Points are the **primary metric** across performance pages, leaderboards, share cards, and round history. Users convert points to money with `profitFromPoints(points, stake)` — profit = points × stake (£). UI: `StakeProfit` component (default stake £10).

**Acca P/L in DB:** `Round.profitLossGbp` still computed at settle (£10 default stake) for admin “successful acca” counts and settlement emails — not shown as the primary user-facing metric.

---

## Odds & competitions

Five competitions in `packages/shared/src/competitions.ts`: EPL, Championship, League One, League Two, World Cup. **Admin toggles** which are visible in the leg picker (`CompetitionSetting` table; `/admin/competitions`). Default: **World Cup only**. Match sync still runs for all catalogue competitions so settled legs can resolve when leagues are re-enabled.

Fixture list uses The Odds API with `commenceTimeFrom` in `YYYY-MM-DDTHH:MM:SSZ` format (no milliseconds) and client-side upcoming filter. When `ODDS_API_KEY` is set, **no mock fallback** — empty list if the bookmaker feed has no upcoming fixtures. **Production never serves demo fixtures**; mock data is local dev only (`source: "mock"`). Check `GET /api/health` → `odds: "configured" | "missing"`.

### Odds flow

```
GET /api/competitions                 → active catalogue (id + name)
GET /api/fixtures?competition=epl     → bulk markets (h2h, totals, spreads)
GET /api/fixtures/[id]/markets?competition=epl&tier=core → lazy per-event tier (default `core` = 3 credits; optional tiers on demand)
POST /api/legs                        → best retail quote; stores competitionId slug
(lock) lockRoundWithAccaPricing()     → re-fetch quotes, rankAccaBookmakers(), store deeplinks on Leg
```

At lock, `Leg.betslipUrl` stores the chosen bookmaker's outcome deeplink; `Leg.bookmakerLinks` maps all retail bookmakers → link. **While collecting:** leg picker shows best odds only. **Once locked:** frozen odds per leg + combined acca; betslip **Open** links until first result; no bookmaker comparison panel.

Requires live odds (`ODDS_API_KEY`) — mock fixtures have no deeplinks. Odds are stored in **PostgreSQL** (`OddsBulkSnapshot`, `OddsEventSnapshot`) and refreshed by cron (`POST /api/internal/warm-odds-cache`). User picks read the DB; set `ODDS_DB_ONLY=true` in production to block live API calls from user traffic.

### Odds API usage (summary)

Full budgeting: [DEPLOYMENT.md — The Odds API](./DEPLOYMENT.md#the-odds-api--calls-credits--cron).

| Call type | Markets | Credits | When |
|-----------|---------|---------|------|
| Bulk fixtures | `h2h`, `spreads`, `totals` | **3** | Cron: once per enabled competition per warm run |
| Core extended | `btts`, `double_chance`, `correct_score` | **3** per fixture | Cron: each upcoming fixture within 72 h (`ODDS_WARM_CORE_WITHIN_HOURS`); or user on demand if DB miss |
| Specials | corners/cards (7 keys) | **7** per fixture | User only (“Load more markets”); not cron-warmed |

**Cron:** `warm-odds-cache` every **6 h UTC** → `3 × competitions + 3 × N` credits per run (`N` = fixtures in warm window). `sync-matches` (every 5 min) uses football-data.org, **not** The Odds API.

**Production target:** `ODDS_DB_ONLY=true` so only cron (+ rare admin probes) call the API.

### Acca bookmaker rankings

At lock, `rankAccaBookmakers()` in `apps/web/src/lib/odds/acca.ts` ranks all retail bookmakers by combined acca odds. Stored as `Round.accaBookmakerRankings` (JSON). Older locked rounds backfill lazily on `GET /api/groups/[id]`. Rankings used for betslip deeplinks at lock; **not shown in UI** once acca is locked (frozen odds only).

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
| `apps/web/src/lib/odds/market-builders.ts` | Odds API → app market mappers |
| `apps/web/src/lib/odds/quotes.ts` | Quote helpers + deeplink resolution |
| `apps/web/src/lib/odds/acca.ts` | Acca bookmaker ranking + best combined |
| `apps/web/src/lib/odds/lock-round.ts` | Lock + reprice + store deeplinks |
| `apps/web/src/lib/odds/bookmakers.ts` | Retail filter, sort best odds |
| `apps/web/src/components/group-ui.tsx` | Leg picker (4-step), locked round picks, settle UI |
| `apps/web/src/components/app-nav.tsx` | Header nav: Groups / Performance / Admin |
| `apps/web/src/components/group-nav.tsx` | Group tabs: Round / Leaderboard / Performance |
| `apps/web/src/components/group-layout-client.tsx` | Shared group shell + `GroupDataProvider` |
| `apps/web/src/context/group-data.tsx` | Group data context for sub-pages |

---

## Web pages

Protected routes enforced in `apps/web/src/middleware.ts`: `/dashboard`, `/groups/*`, `/performance`, `/admin`. Middleware uses edge-safe `auth.config.ts` only (no Prisma); credentials + DB live in `auth.ts`.

| Path | Purpose |
|------|---------|
| `/` | Landing — hero, value props, how it works, FAQ, CTA |
| `/about` | Product story, what we are/aren’t, responsible gambling |
| `/sign-in`, `/sign-up` | Auth |
| `/dashboard` | **Groups home** — list of user's syndicates only |
| `/performance` | Cross-group stats (`DashboardStats`) + share cards |
| `/admin` | **Admin** — platform metrics (admin role only) |
| `/admin/leaderboards` | **Admin** — syndicate & player rankings by points |
| `/admin/competitions` | **Admin** — enable/disable competitions in leg picker |
| `/admin/odds` | **Admin** — Odds API diagnostics (fixture pipeline) |
| `/groups/create`, `/groups/join` | Create / join group |
| `/groups/[id]` | **Round** tab — active round, leg picker, picks, lock, settle |
| `/groups/[id]/leaderboard` | Points leaderboard |
| `/groups/[id]/performance` | Group stats (`GroupStats`) — charts, member breakdown |

**Navigation:** `AppNav` in header (Groups ↔ Performance ↔ Admin for platform admins). Inside a group, `GroupNav` tabs share data via `GroupDataProvider` (fetched once in group layout; polls every 60s while acca locked).

**Locked round UI:** Picks list with per-leg outcomes as matches finish (Won/Lost/Awaiting badges) → locked combined odds + bookmaker (no comparison panel) → betslip CTA until first result, then tracking only. Polls every 60s while locked. **Recent rounds** show locked odds per leg.

---

## Settlement

| Method | Route | Notes |
|--------|-------|-------|
| Manual | `POST /api/rounds/[id]/settle` | Owner marks won/lost/void per leg |
| Auto (owner) | `POST /api/rounds/[id]/auto-settle` | Reads synced `Match` rows |
| Auto (hands-off) | Via `POST /api/internal/sync-matches` | Cron sync → auto-settles all ready locked rounds; resolved legs update before full acca settles |

Email notifications (Resend) fire on lock and settle when `RESEND_API_KEY` + `EMAIL_FROM` are set. Deduped via `Round.lockedNotificationSentAt` / `settledNotificationSentAt`.

### Cron (internal)

| Route | Role |
|-------|------|
| `POST /api/internal/sync-matches` | football-data.org → `Match` table |
| `POST /api/internal/warm-odds-cache` | Refresh odds snapshots in DB |

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/settlement/auto-settle-round.ts` | Hands-off + owner auto-settle |
| `apps/web/src/lib/settlement/resolve-round-outcomes.ts` | Match → leg outcomes; `persistResolvableLegOutcomes()` |
| `apps/web/src/lib/notifications/round-notifications.ts` | Locked / settled emails |
| `apps/web/src/lib/notifications/email.ts` | Resend client (fetch) |
| `apps/web/src/lib/results/football-data.ts` | football-data.org fetch, team matching; cache bypass on cron sync |
| `apps/web/src/lib/results/sync-matches.ts` | Upsert matches for all competitions |
| `apps/web/src/lib/results/match-store.ts` | DB lookup for auto-settle |
| `apps/web/src/lib/results/resolve-leg.ts` | Market → outcome logic |
| `apps/web/src/lib/settlement/apply-round-settlement.ts` | DB updates, P/L |

---

## Admin & analytics

→ Full spec: [specs/platform-admin.md](./specs/platform-admin.md)

Platform admins (`User.role = admin`) see an **Admin** tab with **Overview** and **Leaderboards**.

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

### Leaderboards (`/admin/leaderboards`)

| Leaderboard | Ranked by |
|-------------|-----------|
| Syndicates | Sum of `GroupMember.points` per group |
| Players | `User.totalPoints` (all groups) |

Admin-only for now; public rollout planned when user base grows.

### Analytics events

`AnalyticsEvent` table: `sign_up`, `login`, `page_view`. Recorded on sign-up, sign-in (web + mobile), and server-rendered page loads.

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/auth.config.ts` | Edge-safe Auth.js (middleware) |
| `apps/web/src/lib/auth.ts` | Credentials sign-in, JWT role refresh |
| `apps/web/src/lib/admin.ts` | `requireAdmin`, `ADMIN_EMAILS` promotion |
| `apps/web/src/lib/admin/compute-admin-stats.ts` | Overview aggregates |
| `apps/web/src/lib/admin/compute-platform-leaderboards.ts` | Leaderboard queries |
| `apps/web/src/lib/analytics.ts` | `recordAnalyticsEvent` |
| `apps/web/src/components/admin-page-shell.tsx` | Admin layout + nav |
| `apps/web/src/components/admin-stats.tsx` | Overview UI |
| `apps/web/src/components/platform-leaderboards.tsx` | Leaderboard tables |
| `apps/web/src/components/stake-profit.tsx` | Points → profit converter |
| `GET /api/admin/stats` | JSON overview (admin session) |
| `GET /api/admin/leaderboards` | JSON leaderboards (admin session) |

**Analytics limitations:** page views on server render only (not in-group tab switches). See spec for details.

---

## Stats

Computed on read from settled rounds. No materialised stats tables.

| Route | Purpose |
|-------|---------|
| `GET /api/groups/[id]/stats` | Group summary + cumulative points chart |
| `GET /api/groups/[id]/members/[userId]/stats` | Member breakdown, favourites, best/worst |
| `GET /api/user/stats` | Cross-group performance summary + chart |

| Path | Role |
|------|------|
| `apps/web/src/lib/stats/compute-group-stats.ts` | Group summary metrics |
| `apps/web/src/lib/stats/compute-member-stats.ts` | Member breakdown |
| `apps/web/src/lib/stats/compute-user-stats.ts` | Cross-group user stats |
| `apps/web/src/lib/stats/compute-member-chart.ts` | Multi-member chart series |
| `apps/web/src/lib/stats/helpers.ts` | Shared helpers (favourites, best/worst) |
| `apps/web/src/components/group-stats.tsx` | Group performance UI (Recharts) |
| `apps/web/src/components/dashboard-stats.tsx` | Cross-group performance UI (`/performance`) |
| `apps/web/src/components/share-card.tsx` | Shareable stats card (copy / Web Share) |

---

## Environment variables

### Local (`apps/web/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL |
| `AUTH_SECRET` | Yes | Auth.js + mobile JWT |
| `NEXTAUTH_URL` | Yes | e.g. `http://localhost:3000` |
| `ODDS_API_KEY` | No | Live odds; omit = mock |
| `ODDS_API_SPORT` | No | Default `soccer_fifa_world_cup` (fallback only) |
| `FOOTBALL_DATA_API_KEY` | No | Match sync |
| `FOOTBALL_DATA_CACHE_TTL_MS` | No | In-memory cache TTL for football-data fetches (default 60s; bypassed on cron sync) |
| `ODDS_API_CACHE_TTL_MS` | No | DB snapshot TTL for odds (default 30 min) |
| `ODDS_DB_ONLY` | No | When `true`, user routes read odds DB only (cron must refresh) |
| `ODDS_WARM_CORE_WITHIN_HOURS` | No | Cron prefetches core extended markets within N hours of kickoff (default 72) |
| `CRON_SECRET` | No | Bearer token for `/api/internal/*` cron routes |
| `RESEND_API_KEY` | No | Email notifications via Resend |
| `EMAIL_FROM` | No | Sender address (required with `RESEND_API_KEY`) |
| `ADMIN_EMAILS` | No | Comma-separated emails granted platform admin |

### Production (GitHub Actions → Cloud Run)

Secrets: `DATABASE_URL`, `AUTH_SECRET` (Terraform Secret Manager + `deploy.yml`), `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `RESEND_API_KEY` (optional), GCP deploy secrets. `CRON_SECRET` is in Secret Manager (Terraform); optional GitHub secret only to seed Terraform without rotating.

Env vars on Cloud Run: `NEXTAUTH_URL`, `EMAIL_FROM`, `ADMIN_EMAILS` (from GitHub secret), `ODDS_API_SPORT`, `ODDS_API_REGIONS=uk`, etc. See `.github/workflows/deploy.yml`.

---

## Database (Prisma)

Core models: `User`, `Group`, `GroupMember`, `Round`, `Leg`, `Match`, `AnalyticsEvent`, `CompetitionSetting`.

- `User.role` — platform role: `user` (default) or `admin` (via `ADMIN_EMAILS`).
- `AnalyticsEvent` — lightweight product analytics (`type`, `userId?`, `path?`, `createdAt`).
- One leg per user per round (`@@unique([roundId, userId])`).
- Leg stores fixture snapshot: teams, kickoff, `competitionId` (slug), `competition` (display name), optional `matchId` FK, market, odds, bookmaker, `betslipUrl`, `bookmakerLinks` JSON, outcome.
- `Match` — canonical result per fixture (`externalDataId` from football-data.org).
- `Round.accaBookmakerRankings` — JSON array of ranked bookmakers at lock.
- `CompetitionSetting` — `competitionId` slug + `enabled` flag for leg-picker visibility (seeded: World Cup on, leagues off).
- Groups always have a collecting or locked round; a new collecting round opens automatically when the previous round settles. Legacy groups without an active round get one on next load.
- `Round.lockedNotificationSentAt` / `settledNotificationSentAt` — email dedup.

Schema: `packages/database/prisma/schema.prisma`

Recent migrations include `20260711100000_competition_settings` (admin competition toggles).

---

## API routes (web)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/competitions` | Session | Enabled competitions for leg picker |
| `GET /api/fixtures` | Session | List fixtures (`?competition=` required) |
| `GET /api/fixtures/[id]/markets` | Session | Extended markets (`?competition=` required) |
| `POST /api/legs` | Session | Submit leg |
| `POST /api/rounds/[id]/settle` | Owner | Manual settle |
| `POST /api/rounds/[id]/auto-settle` | Owner | Auto settle from `Match` table |
| `POST /api/internal/sync-matches` | `CRON_SECRET` | Sync football-data.org → `Match` |
| `POST /api/internal/warm-odds-cache` | `CRON_SECRET` | Refresh odds DB snapshots |
| `GET /api/groups/[id]` | Member | Group + active round + betslip deeplinks |
| `GET /api/groups/[id]/stats` | Member | Group summary stats + chart series |
| `GET /api/groups/[id]/members/[userId]/stats` | Member | Member breakdown + favourites |
| `GET /api/user/stats` | Session | Cross-group performance stats |
| `GET /api/admin/stats` | Admin | Platform summary metrics |
| `GET /api/admin/leaderboards` | Admin | Syndicate + player point rankings |
| `GET /api/admin/competitions` | Admin | All competitions + enabled flags |
| `PATCH /api/admin/competitions` | Admin | Enable/disable competition for users |
| `GET /api/admin/odds-diagnostics` | Admin | Probe Odds API pipeline (`?competition=`) |
| `GET /api/health` | Public | Health check (+ `odds: configured|missing`) |

---

## Known limitations

1. **football-data.org free tier:** World Cup syncs; League One/Two return 403; EPL/Championship may be empty off-season.
2. **Auto-settle** runs automatically after match sync (every 5 min); individual leg outcomes update as matches finish; round settles when all legs are ready. Owner can still trigger manually.
3. **Email notifications** require Resend setup (`RESEND_API_KEY`, `EMAIL_FROM`); skipped if unset.
4. **Auto-settle requires synced `Match` rows** — 5-min cron or manual `POST /api/internal/sync-matches`.
5. **Cross-competition acca** — often no single bookmaker; best-per-leg odds locked at submission; per-leg deeplinks at lock only.
6. **Betslip deeplinks** require live odds API (`includeLinks`); mock mode falls back to bookmaker hub URLs only.
7. **The Odds API quota** — credits = `markets × regions`. Cron warm: **3** bulk + **3 × N** core per enabled competition every 6 h (`N` = fixtures within `ODDS_WARM_CORE_WITHIN_HOURS`, default 72). User “specials” tier = **7** per fixture on demand only. Set `ODDS_DB_ONLY=true` so users do not call the API. See [DEPLOYMENT.md](./DEPLOYMENT.md#the-odds-api--calls-credits--cron).
8. **Terraform CI** may fail on GCS state bucket permissions — app deploy unaffected.
9. **Odds snapshots in PostgreSQL** — shared across Cloud Run instances; refreshed by `POST /api/internal/warm-odds-cache` (Cloud Scheduler job in Terraform). Set `ODDS_DB_ONLY=true` so users never burn API credits. In-memory cache remains for quota block/snapshot and football-data only.
10. **Mobile app** — still calls old fixtures API without `?competition=`; paused until web validated.
11. **Auth JWT** — middleware uses edge-safe `auth.config.ts` (no Prisma); `auth.ts` refreshes `role` from DB on each session update.

## Production checklist (operators)

- [x] `ODDS_API_KEY` in GitHub secrets
- [x] `FOOTBALL_DATA_API_KEY` in GitHub secrets
- [x] `CRON_SECRET` in Secret Manager + Cloud Scheduler jobs (`sync-matches`, `warm-odds-cache`) via Terraform
- [x] `NEXTAUTH_URL=https://www.the-syndicate.uk`
- [x] Cloudflare Worker + www redirect configured
- [x] `RESEND_API_KEY` + `EMAIL_FROM` in GitHub (optional, for email notifications)
- [x] `ADMIN_EMAILS` in GitHub secrets + passed to Cloud Run via `deploy.yml`

## GCP cost notes

Cloud SQL is typically **~90%** of GCP forecast. Current Terraform defaults: `db-f1-micro`, zonal, Enterprise edition, PITR enabled in prod. Cloud Run `min_instances = 0`.

Options to reduce spend: verify instance tier in console, disable PITR if acceptable, reduce backup retention, or migrate to Neon/Supabase. See [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization).

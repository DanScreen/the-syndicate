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

Omit `ODDS_API_KEY` for mock fixtures. Add `FOOTBALL_DATA_API_KEY` + `CRON_SECRET` to test match sync locally.

### Deploy

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`): build → `db:migrate:deploy` → Cloud Run.

Match sync: Cloud Scheduler → `POST /api/internal/sync-matches` with Bearer `CRON_SECRET` (hourly UTC). See [DEPLOYMENT.md](./DEPLOYMENT.md).

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
| Settlement (auto) | `apps/web/src/lib/settlement/auto-settle-round.ts` |
| Group UI | `apps/web/src/components/group-ui.tsx`, `group-stats.tsx` |
| Scoring | `packages/shared/src/scoring.ts` |
| Competitions catalogue | `packages/shared/src/competitions.ts` |

### What's next (July 2026)

See [ROADMAP.md](./ROADMAP.md) → **Next — backlog**. Core MVP is shipped.

---

## What works today

| Area | Status |
|------|--------|
| Auth (email/password, Auth.js JWT sessions) | ✅ |
| Groups, invite codes, join links (`?code=`) | ✅ |
| Rounds: collecting → locked → settled | ✅ |
| Live odds ([The Odds API](https://the-odds-api.com/)) + mock fallback | ✅ |
| Markets: h2h, totals (dynamic lines), spreads*, BTTS, double chance, draw no bet | ✅ |
| Per-leg competition picker (5 leagues + World Cup) | ✅ |
| Leg picker: best odds only per selection | ✅ |
| Acca lock: best combined bookmaker across all legs | ✅ |
| Acca bookmaker rankings (best odds first, stored at lock) | ✅ |
| Match table + football-data.org sync cron | ✅ |
| Hands-off auto-settle (post-sync cron) | ✅ |
| Email notifications (round locked / settled) | ✅ |
| Manual settle + auto-settle (owner-triggered) | ✅ |
| Unit-stake points + leaderboard | ✅ |
| Group stats summary + cumulative points chart | ✅ |
| Member stats breakdowns + multi-member chart | ✅ |
| Dashboard cross-group stats + share cards | ✅ |
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

**Group acca P/L:** theoretical **£10** stake on combined acca odds. All legs won → `stake × combinedOdds − stake`; any loss → `−stake`. See `lib/settlement/`.

---

## Odds & competitions

Five competitions in `packages/shared/src/competitions.ts`: EPL, Championship, League One, League Two, World Cup.

### Odds flow

```
GET /api/competitions                 → active catalogue (id + name)
GET /api/fixtures?competition=epl     → bulk markets (h2h, totals, spreads)
GET /api/fixtures/[id]/markets?competition=epl → lazy: btts, double_chance, draw_no_bet
POST /api/legs                        → best retail quote; stores competitionId slug
(lock) lockRoundWithAccaPricing()     → re-fetch quotes, rankAccaBookmakers(), store on Round
```

### Acca bookmaker rankings

At lock, `rankAccaBookmakers()` in `apps/web/src/lib/odds/acca.ts` ranks all retail bookmakers by combined acca odds. Stored as `Round.accaBookmakerRankings` (JSON). Older locked rounds backfill lazily on `GET /api/groups/[id]`. UI: "Where to place (best odds first)" in `AccaSummary`.

Types: `packages/shared/src/acca.ts`. Migration: `20260710010000_acca_bookmaker_rankings`.

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/odds/provider.ts` | Live vs mock orchestration (per competition) |
| `packages/shared/src/competitions.ts` | Competition catalogue |
| `apps/web/src/lib/odds/the-odds-api.ts` | Bulk + per-event API |
| `apps/web/src/lib/odds/event-markets.ts` | BTTS, double chance, DNB |
| `apps/web/src/lib/odds/acca.ts` | Acca bookmaker ranking + best combined |
| `apps/web/src/lib/odds/lock-round.ts` | Lock + reprice + store rankings |
| `apps/web/src/lib/odds/bookmakers.ts` | Retail filter, sort best odds |
| `apps/web/src/components/group-ui.tsx` | Leg picker (4-step), AccaSummary, settle UI |

---

## Settlement

| Method | Route | Notes |
|--------|-------|-------|
| Manual | `POST /api/rounds/[id]/settle` | Owner marks won/lost/void per leg |
| Auto (owner) | `POST /api/rounds/[id]/auto-settle` | Reads synced `Match` rows |
| Auto (hands-off) | Via `POST /api/internal/sync-matches` | Cron sync → auto-settles all ready locked rounds |
| Sync | `POST /api/internal/sync-matches` | Cron: football-data.org → `Match` table |

Email notifications (Resend) fire on lock and settle when `RESEND_API_KEY` + `EMAIL_FROM` are set. Deduped via `Round.lockedNotificationSentAt` / `settledNotificationSentAt`.

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/settlement/auto-settle-round.ts` | Hands-off + owner auto-settle |
| `apps/web/src/lib/settlement/resolve-round-outcomes.ts` | Match → leg outcomes |
| `apps/web/src/lib/notifications/round-notifications.ts` | Locked / settled emails |
| `apps/web/src/lib/notifications/email.ts` | Resend client (fetch) |
| `apps/web/src/lib/results/football-data.ts` | football-data.org fetch, team matching |
| `apps/web/src/lib/results/sync-matches.ts` | Upsert matches for all competitions |
| `apps/web/src/lib/results/match-store.ts` | DB lookup for auto-settle |
| `apps/web/src/lib/results/resolve-leg.ts` | Market → outcome logic |
| `apps/web/src/lib/settlement/apply-round-settlement.ts` | DB updates, P/L |

---

## Stats

Computed on read from settled rounds. No materialised stats tables.

| Route | Purpose |
|-------|---------|
| `GET /api/groups/[id]/stats` | Group summary + cumulative points chart |
| `GET /api/groups/[id]/members/[userId]/stats` | Member breakdown, favourites, best/worst |
| `GET /api/user/stats` | Cross-group dashboard summary + chart |

| Path | Role |
|------|------|
| `apps/web/src/lib/stats/compute-group-stats.ts` | Group summary metrics |
| `apps/web/src/lib/stats/compute-member-stats.ts` | Member breakdown |
| `apps/web/src/lib/stats/compute-user-stats.ts` | Cross-group user stats |
| `apps/web/src/lib/stats/compute-member-chart.ts` | Multi-member chart series |
| `apps/web/src/lib/stats/helpers.ts` | Shared helpers (favourites, best/worst) |
| `apps/web/src/components/group-stats.tsx` | Group performance UI (Recharts) |
| `apps/web/src/components/dashboard-stats.tsx` | Dashboard cross-group UI |
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
| `CRON_SECRET` | No | Bearer token for `/api/internal/sync-matches` |
| `RESEND_API_KEY` | No | Email notifications via Resend |
| `EMAIL_FROM` | No | Sender address (required with `RESEND_API_KEY`) |

### Production (GitHub Actions → Cloud Run)

Secrets: `DATABASE_URL`, `AUTH_SECRET`, `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY` (optional), GCP deploy secrets.

Env vars on Cloud Run: `NEXTAUTH_URL`, `EMAIL_FROM`, `ODDS_API_SPORT`, `ODDS_API_REGIONS=uk`, etc. See `.github/workflows/deploy.yml`.

---

## Database (Prisma)

Core models: `User`, `Group`, `GroupMember`, `Round`, `Leg`, `Match`.

- One leg per user per round (`@@unique([roundId, userId])`).
- Leg stores fixture snapshot: teams, kickoff, `competitionId` (slug), `competition` (display name), optional `matchId` FK, market, odds, bookmaker, outcome.
- `Match` — canonical result per fixture (`externalDataId` from football-data.org).
- `Round.accaBookmakerRankings` — JSON array of ranked bookmakers at lock.
- `Round.lockedNotificationSentAt` / `settledNotificationSentAt` — email dedup.

Schema: `packages/database/prisma/schema.prisma`

Recent migrations: `20260709120000_leg_competition_id`, `20260709130000_match_table`, `20260709140000_float_points`, `20260710000000_backfill_unit_stake_points`, `20260710010000_acca_bookmaker_rankings`, `20260710020000_round_notification_timestamps`.

---

## API routes (web)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/competitions` | Session | Active competition catalogue |
| `GET /api/fixtures` | Session | List fixtures (`?competition=` required) |
| `GET /api/fixtures/[id]/markets` | Session | Extended markets (`?competition=` required) |
| `POST /api/legs` | Session | Submit leg |
| `POST /api/groups/[id]/rounds` | Owner | Start round |
| `POST /api/rounds/[id]/settle` | Owner | Manual settle |
| `POST /api/rounds/[id]/auto-settle` | Owner | Auto settle from `Match` table |
| `POST /api/internal/sync-matches` | `CRON_SECRET` | Sync football-data.org → `Match` |
| `GET /api/groups/[id]` | Member | Group + active round + betslip link |
| `GET /api/groups/[id]/stats` | Member | Group summary stats + chart series |
| `GET /api/groups/[id]/members/[userId]/stats` | Member | Member breakdown + favourites |
| `GET /api/user/stats` | Session | Cross-group dashboard stats |
| `GET /api/health` | Public | Health check |

---

## Known limitations

1. **football-data.org free tier:** World Cup syncs; League One/Two return 403; EPL/Championship may be empty off-season.
2. **Auto-settle** runs automatically after hourly match sync; owner can still trigger manually.
3. **Email notifications** require Resend setup (`RESEND_API_KEY`, `EMAIL_FROM`); skipped if unset.
4. **Auto-settle requires synced `Match` rows** — hourly cron or manual `POST /api/internal/sync-matches`.
5. **Cross-competition acca** — often no single bookmaker; UI shows ranked alternatives + "place individually".
6. **The Odds API quota** — per-event market calls cost credits; lazy-loaded on fixture select.
7. **Terraform CI** may fail on GCS state bucket permissions — app deploy unaffected.
8. **Cloud Run in-memory cache** — cold instances miss cache; not shared across instances.
9. **Mobile app** — still calls old fixtures API without `?competition=`; paused until web validated.

## Production checklist (operators)

- [x] `ODDS_API_KEY` in GitHub secrets
- [x] `FOOTBALL_DATA_API_KEY` in GitHub secrets
- [x] `CRON_SECRET` in GitHub secrets + Cloud Scheduler job (hourly UTC)
- [x] `NEXTAUTH_URL=https://www.the-syndicate.uk`
- [x] Cloudflare Worker + www redirect configured
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` in GitHub (optional, for email notifications)

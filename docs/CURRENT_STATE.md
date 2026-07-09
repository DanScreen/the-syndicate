# Current state (as-built)

Last updated to reflect production as of July 2026. **Update this file when you ship.**

Canonical URL: **https://www.the-syndicate.uk** (apex `the-syndicate.uk` → 301 to www via Cloudflare).

Mobile app (`apps/mobile/`) is **paused** — web only.

---

## What works today

| Area | Status |
|------|--------|
| Auth (email/password, Auth.js JWT sessions) | ✅ |
| Groups, invite codes, join links (`?code=`) | ✅ |
| Rounds: collecting → locked → settled | ✅ |
| Live odds ([The Odds API](https://the-odds-api.com/)) + mock fallback | ✅ |
| Markets: h2h, totals (dynamic lines), spreads*, BTTS, double chance, draw no bet | ✅ |
| Leg picker: best odds only per selection | ✅ |
| Acca lock: best combined bookmaker across all legs | ✅ |
| Manual settle + auto-settle (football-data.org) | ✅ |
| Leaderboard (flat points — see Scoring) | ✅ |
| Round history, progress UI, landing/SEO | ✅ |

\*Asian handicap only from exchange bookmakers in current World Cup UK feed — filtered out; handicap UI empty for those fixtures.

---

## Scoring (today vs planned)

**Today (implemented):** flat leg points in `packages/shared/src/constants.ts`

| Outcome | Points |
|---------|--------|
| Won | +3 |
| Void | +1 |
| Lost | 0 |

**Planned:** unit-stake model (`odds − 1` win, `−1` loss) — [specs/group-stats-and-points.md](./specs/group-stats-and-points.md)

**Group acca P/L (today):** theoretical **£10** stake on combined acca odds. All legs won → `stake × combinedOdds − stake`; any loss → `−stake`. See `lib/settlement.ts`.

---

## Odds & competitions (today)

- **Per-leg competition picker:** ✅ five leagues + World Cup — [specs/competitions-and-results.md](./specs/competitions-and-results.md) Phase A
- **Single sport via env:** `ODDS_API_SPORT` still used as fallback in odds client; fixtures are fetched per `?competition=` slug

### Odds flow

```
GET /api/competitions                 → active catalogue (id + name)
GET /api/fixtures?competition=epl     → bulk markets (h2h, totals, spreads)
GET /api/fixtures/[id]/markets?competition=epl → lazy: btts, double_chance, draw_no_bet
POST /api/legs                        → best retail quote; stores competitionId slug
(lock) lockRoundWithAccaPricing()     → re-fetch quotes per leg competition, findBestAccaBookmaker
```

Key files:

| Path | Role |
|------|------|
| `apps/web/src/lib/odds/provider.ts` | Live vs mock orchestration (per competition) |
| `packages/shared/src/competitions.ts` | Competition catalogue (slug, odds API sport, football-data code) |
| `apps/web/src/lib/odds/the-odds-api.ts` | Bulk + per-event API |
| `apps/web/src/lib/odds/event-markets.ts` | BTTS, double chance, DNB |
| `apps/web/src/lib/odds/acca.ts` | Best combined acca bookmaker |
| `apps/web/src/lib/odds/lock-round.ts` | Lock + reprice legs |
| `apps/web/src/lib/odds/bookmakers.ts` | Retail filter, sort best odds |
| `apps/web/src/components/group-ui.tsx` | Leg picker, AccaSummary, settle UI |

---

## Settlement (today)

| Method | Route | Notes |
|--------|-------|-------|
| Manual | `POST /api/rounds/[id]/settle` | Owner marks won/lost/void per leg |
| Auto | `POST /api/rounds/[id]/auto-settle` | football-data.org by team + date; one fetch per round |

Key files:

| Path | Role |
|------|------|
| `apps/web/src/lib/results/football-data.ts` | Fetch matches, team matching |
| `apps/web/src/lib/results/resolve-leg.ts` | Market → outcome logic |
| `apps/web/src/lib/settlement/apply-round-settlement.ts` | DB updates, P/L |

**Planned:** shared `Match` table + cron ingest — [specs/competitions-and-results.md](./specs/competitions-and-results.md)

---

## Environment variables

### Local (`apps/web/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL |
| `AUTH_SECRET` | Yes | Auth.js + mobile JWT |
| `NEXTAUTH_URL` | Yes | e.g. `http://localhost:3000` |
| `ODDS_API_KEY` | No | Live odds; omit = mock |
| `ODDS_API_SPORT` | No | Default `soccer_fifa_world_cup` |
| `FOOTBALL_DATA_API_KEY` | No | Auto-settle |

### Production (GitHub Actions → Cloud Run)

Secrets: `DATABASE_URL`, `AUTH_SECRET`, `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, GCP deploy secrets.

Env vars on Cloud Run: `NEXTAUTH_URL`, `ODDS_API_SPORT`, `ODDS_API_REGIONS=uk`, etc. See `.github/workflows/deploy.yml`.

---

## Database (Prisma)

Core models: `User`, `Group`, `GroupMember`, `Round`, `Leg`.

- One leg per user per round (`@@unique([roundId, userId])`).
- Leg stores fixture snapshot: teams, kickoff, `competitionId` (slug), `competition` (display name), market, odds, bookmaker, outcome.
- No `Match` table or `matchId` FK yet.

Schema: `packages/database/prisma/schema.prisma`

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
| `POST /api/rounds/[id]/auto-settle` | Owner | Auto settle |
| `GET /api/groups/[id]` | Member | Group + active round + betslip link |
| `GET /api/health` | Public | Health check |

---

## Known limitations

1. **Terraform CI** may fail on GCS state bucket permissions — app deploy unaffected.
2. **Cloud Run in-memory cache** — cold instances miss cache; not shared across instances.
3. **Auto-settle** matches by team name + kickoff date — aliases in `football-data.ts`; no `Match` FK yet.
4. **Cross-competition acca** — often no single bookmaker for full acca; UI explains place individually.
5. **The Odds API quota** — per-event market calls cost credits; lazy-loaded on fixture select.

---

## Production checklist (operators)

- [ ] `ODDS_API_KEY` in GitHub secrets  
- [ ] `FOOTBALL_DATA_API_KEY` in GitHub secrets  
- [ ] `NEXTAUTH_URL=https://www.the-syndicate.uk`  
- [ ] Cloudflare Worker + www redirect configured  

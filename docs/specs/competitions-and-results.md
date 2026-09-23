# Spec: Competitions & shared results

| Field | Value |
|-------|-------|
| **Status** | Phases A–C done |
| **Depends on** | — |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

---

## Goals

1. **Curated competitions** — English leagues, top European divisions, and FIFA World Cup (expand later).
2. **Per-leg competition picker** — each member chooses their own competition before fixtures (cross-competition accas are intentional).
3. **Shared match results** — one canonical result per fixture, polled once per competition, reused by all groups.

---

## Implemented (do not re-build)

### Odds UX

- **Leg submit:** best retail odds only — `sortQuotesByBestOdds`, no bookmaker picker.
- **Acca lock:** `rankAccaBookmakers()` + `findBestAccaBookmaker` in `lib/odds/acca.ts`, `lockRoundWithAccaPricing` in `lib/odds/lock-round.ts`.
- **UI (bet open):** leg picker shows best odds per selection.
- **UI (locked):** frozen leg + combined odds, per-leg outcome badges, no bookmaker comparison; betslip links until first result.

If no single bookmaker covers all legs → best-per-leg combined odds locked at submission; per-leg deeplinks at lock.

### Competition picker (Phase A)

- Catalogue: `packages/shared/src/competitions.ts`
- `GET /api/competitions`, `GET /api/fixtures?competition=`, `Leg.competitionId`
- 4-step `SubmitLegForm`: competition → fixture → market → selection

### Match table + sync (Phase B)

- `Match` model, `Leg.matchId` FK
- `POST /api/internal/sync-matches` (Bearer `CRON_SECRET`)
- Sync **bypasses** football-data in-memory cache (`bypassCache: true`) for fresh results every cron run
- Stores **90-minute (regulation)** scores via `score.regularTime` when extra time is played; `fullTime` only for regular-duration matches (otherwise no 90' score → the feed abstains)
- **Two sources (Sept 2026):** football-data.org + API-Football readings are stored as `MatchObservation` rows and combined by consensus into `Match` — see [Results sync](#results-sync-as-built) and [odds-and-results-sourcing.md](./odds-and-results-sourcing.md)
- Stamps `Match.finishedAt` + `Match.scoreStableSince` on first terminal status; auto-settle waits until the FT score is unchanged for `RESULT_CONFIRMATION_MS` (1h), capped by `RESULT_CONFIRMATION_MAX_MS` (4h); feed score changes restart the stability clock; `scoreLocked` admin overrides skip feed overwrites and confirm immediately
- Cron reconciles Match score → leg outcomes for `RESULT_RECONCILE_MS` (24h) after FT so late VAR / disallowed-goal corrections auto-fix settled legs
- Auto-settle reads from `Match` table via `match-store.ts` (UTC kickoff day matching)
- Cloud Scheduler: every 5 min UTC in production (`europe-west2`, job `sync-matches`)
- **Progressive outcomes:** `persistResolvableLegOutcomes()` updates leg `outcome` as matches finish; round settles when all legs ready
- **Exactly-once:** `applyRoundSettlement()` is transactional and claims the round with an atomic `locked → settled` `updateMany`, so overlapping settle attempts never double-count points (loser throws `RoundNotSettleableError`, treated as a no-op)
- **System-only:** owner settle routes removed (July 2026) — the cron is the sole settlement path; picks are editable until the first kickoff via `PATCH /api/legs/[id]`
- **Deadline lock (July 2026):** open rounds with ≥1 leg lock when the earliest leg kicks off; partial accas allowed — [round-deadline-lock.md](./round-deadline-lock.md)

---

## Phase 1 competitions (catalogue)

| Slug | Display name | The Odds API `sport_key` | football-data `code` | API-Football league |
|------|--------------|--------------------------|----------------------|---------------------|
| `epl` | Premier League | `soccer_epl` | `PL` | 39 |
| `championship` | Championship | `soccer_efl_champ` | `ELC` | 40 |
| `league-one` | League One | `soccer_england_league1` | — (`EL1` not on free tier) | 41 |
| `league-two` | League Two | `soccer_england_league2` | — (`EL2` not on free tier) | 42 |
| `la-liga` | La Liga | `soccer_spain_la_liga` | `PD` | 140 |
| `ligue-1` | Ligue 1 | `soccer_france_ligue_one` | `FL1` | 61 |
| `serie-a` | Serie A | `soccer_italy_serie_a` | `SA` | 135 |
| `bundesliga` | Bundesliga | `soccer_germany_bundesliga` | `BL1` | 78 |
| `world-cup` | FIFA World Cup | `soccer_fifa_world_cup` | `WC` | 1 |

Full catalogue (20 competitions, all with an `apiFootballLeagueId`): `packages/shared/src/competitions.ts`.

**Phase 1b:** Carabao Cup / EFL Cup (`efl-cup`, Odds API `soccer_england_efl_cup`, API-Football 48) **shipped**. League One + League Two (`league-one` / `league-two`, Odds API `soccer_england_league1` / `soccer_england_league2`) **shipped**. FA Cup (`fa-cup`, `soccer_fa_cup`, API-Football 45) **shipped 2026-09-23**. None has a free-tier football-data code, so all settle from API-Football alone (manual settlement only if `API_FOOTBALL_KEY` is unset).

---

## UX: competition before fixtures (per leg)

```
Submit leg form
  1. Pick competition
  2. Pick fixture (filtered)
  3. Pick market → selection (best odds)
  4. Submit
```

- **No `competitionId` on `Round`** — rounds are competition-agnostic.
- `Leg.competitionId` (slug) + existing `Leg.competition` (display name).

---

## Data model (as-built)

```prisma
model Leg {
  competitionId String
  competition   String
  matchId       String?  // FK → Match
}

model Match {
  id              String    @id @default(cuid())
  competitionId   String
  kickoff         DateTime
  homeTeam        String
  awayTeam        String
  status          String    @default("SCHEDULED")
  homeGoals       Int?
  awayGoals       Int?
  finishedAt      DateTime? // first observed FINISHED
  scoreStableSince DateTime? // last FT score change; confirmation waits 1h from here
  scoreLocked     Boolean   @default(false) // admin override — sync won't overwrite score
  externalOddsId  String?   @unique
  externalDataId  Int?      @unique
  lastSyncedAt    DateTime?
  @@index([competitionId, kickoff])
}
```

Full schema: `packages/database/prisma/schema.prisma`

---

## Results sync (as-built)

```mermaid
flowchart LR
  FD[football-data.org] -->|cron every 5 min| Obs[(MatchObservation)]
  AF[API-Football] -->|cron every 5 min| Obs
  Obs -->|resolveMatchConsensus| Match[(Match)]
  Match --> Reconcile[reconcileMatchLegOutcomes]
  Match --> Resolve[resolveLegOutcome]
  Leg --> Reconcile
  Leg --> Resolve
```

- Ingest: football-data `GET /v4/competitions/{code}/matches` (cache bypassed on cron sync); API-Football `fixtures?date=` to map Matches with locked legs, then `fixtures?ids=` (≤20) to poll them with statistics.
- Consensus: `agreed` / `single` settle; `conflict` / `abstain` hold for `/admin/results`. Corners legs settle from `Match.stats` once stable for 2h. Details: [CURRENT_STATE — Results sources](../CURRENT_STATE.md#results-sources-consensus).
- Settle: read `Match` table — one result per fixture, shared across all groups; no per-group API calls at settle time.
- Endpoint: `POST /api/internal/sync-matches` (Bearer `CRON_SECRET`). Logs pending settle reasons to Cloud Run stdout.

**Known:** EPL/Championship may be empty off-season. Competitions without a football-data code depend on API-Football alone.

---

## API (as-built)

| Endpoint | Status |
|----------|--------|
| `GET /api/competitions` | ✅ Active catalogue |
| `GET /api/fixtures?competition=` | ✅ Filter by sport key |
| `POST /api/legs` | ✅ Validates `competitionId` |
| `POST /api/internal/sync-matches` | ✅ Cron sync |
| `PATCH /api/legs/[id]` | ✅ Edit own leg until first kickoff (locked rounds reprice) |
| `PATCH /api/admin/matches/[id]` | ✅ Admin score override + lock |
| `POST /api/admin/legs/[id]/correct-outcome` | ✅ Admin outcome correction |

---

## Implementation checklist

### Phase A — Competition picker ✅

- [x] `packages/shared/src/competitions.ts`
- [x] `GET /api/competitions`
- [x] Competition step in `SubmitLegForm`
- [x] `GET /api/fixtures?competition=`
- [x] `Leg.competitionId` migration

### Phase B — Match table + ingest ✅

- [x] `Match` model + migration
- [x] Sync job + Cloud Scheduler
- [x] Auto-settle from DB

### Phase D — Admin competition control ✅

- [x] `CompetitionSetting` model + migration (World Cup enabled by default)
- [x] `GET /api/competitions` returns enabled competitions only
- [x] `GET/PATCH /api/admin/competitions` + `/admin/competitions` UI
- [x] Fixture feed: `commenceTimeFrom=now`, upcoming filter, no mock fallback when `ODDS_API_KEY` set

---
- [x] In-progress locked round UI — outcome badges, locked odds only, 60s client poll

---

## Decisions (resolved)

| Question | Decision |
|----------|----------|
| Ship EPL + World Cup first, or all five? | **All five** shipped in Phase A |
| Ingest frequency | **Every 5 min UTC** via Cloud Scheduler (`*/5 * * * *`) |
| Per-leg deeplinks when no single acca bookmaker? | Per-leg **Open** links at lock via The Odds API `includeLinks`; hidden once results start |
| Show bookmaker comparison after lock? | **No** — frozen odds only; rankings stored for deeplinks at lock |

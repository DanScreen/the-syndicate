# Spec: Competitions & shared results

| Field | Value |
|-------|-------|
| **Status** | Phases A–C done |
| **Depends on** | — |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

---

## Goals

1. **Curated competitions** — English football leagues + FIFA World Cup (expand later).
2. **Per-leg competition picker** — each member chooses their own competition before fixtures (cross-competition accas are intentional).
3. **Shared match results** — one canonical result per fixture, polled once per competition, reused by all groups.

---

## Implemented (do not re-build)

### Odds UX

- **Leg submit:** best retail odds only — `sortQuotesByBestOdds`, no bookmaker picker.
- **Acca lock:** `rankAccaBookmakers()` + `findBestAccaBookmaker` in `lib/odds/acca.ts`, `lockRoundWithAccaPricing` in `lib/odds/lock-round.ts`.
- **UI:** Locked round in `group-ui.tsx` — picks list, primary betslip CTA, collapsible ranked bookmaker comparison.

If no single bookmaker covers all legs → show best-per-leg combined odds; no unified betslip.

### Competition picker (Phase A)

- Catalogue: `packages/shared/src/competitions.ts`
- `GET /api/competitions`, `GET /api/fixtures?competition=`, `Leg.competitionId`
- 4-step `SubmitLegForm`: competition → fixture → market → selection

### Match table + sync (Phase B)

- `Match` model, `Leg.matchId` FK
- `POST /api/internal/sync-matches` (Bearer `CRON_SECRET`)
- Auto-settle reads from `Match` table via `match-store.ts`
- Cloud Scheduler: every 5 min UTC in production

---

## Phase 1 competitions (catalogue)

| Slug | Display name | The Odds API `sport_key` | football-data `code` |
|------|--------------|--------------------------|----------------------|
| `epl` | Premier League | `soccer_epl` | `PL` |
| `championship` | Championship | `soccer_efl_champ` | `ELC` |
| `league-one` | League One | `soccer_england_league1` | `EL1` |
| `league-two` | League Two | `soccer_england_league2` | `EL2` |
| `world-cup` | FIFA World Cup | `soccer_fifa_world_cup` | `WC` |

**Phase 1b (backlog):** FA Cup (`soccer_fa_cup` / `FAC`), EFL Cup.

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
  FD[football-data.org] -->|cron every 5 min| Match[(Match)]
  Match --> Resolve[resolveLegOutcome]
  Leg --> Resolve
```

- Ingest: `GET /v4/competitions/{code}/matches` on schedule.
- Settle: read `Match` table — no per-group API calls at settle time.
- Endpoint: `POST /api/internal/sync-matches` (Bearer `CRON_SECRET`).

**Known:** football-data.org free tier — League One/Two return 403; EPL/Championship empty off-season.

---

## API (as-built)

| Endpoint | Status |
|----------|--------|
| `GET /api/competitions` | ✅ Active catalogue |
| `GET /api/fixtures?competition=` | ✅ Filter by sport key |
| `POST /api/legs` | ✅ Validates `competitionId` |
| `POST /api/internal/sync-matches` | ✅ Cron sync |
| `POST /api/rounds/[id]/auto-settle` | ✅ Reads from `Match` (owner-triggered) |

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

### Phase C — Hands-off ✅

- [x] Post-ingest auto-settle — `autoSettleLockedRounds()` runs after sync
- [x] Email notifications — round locked / settled via Resend

---

## Decisions (resolved)

| Question | Decision |
|----------|----------|
| Ship EPL + World Cup first, or all five? | **All five** shipped in Phase A |
| Ingest frequency | **Hourly UTC** via Cloud Scheduler |
| Per-leg deeplinks when no single acca bookmaker? | Per-leg **Open** links + ranked bookmaker links via The Odds API `includeLinks`; hub URL fallback |

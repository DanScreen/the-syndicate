# Spec: Group stats & performance points

| Field | Value |
|-------|-------|
| **Status** | Phases 1–4 done |
| **Depends on** | `competitionId` on legs (shipped) |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

Related: [competitions-and-results.md](./competitions-and-results.md)

---

## Goals

1. **Group performance hub** — summary + charts beyond leaderboard.
2. **Member profiles within group** — performance over time, favourites, best/worst picks.
3. **Unit-stake points** — chart metric that reflects betting P&L on a £1 leg stake.

---

## Performance points (implemented)

| Outcome | Points |
|---------|--------|
| **Won** | `odds − 1` |
| **Lost** | `−1` |
| **Void** | `0` |

Implementation: `legPointsForOutcome()` in `packages/shared/src/scoring.ts`.

**Charts:** cumulative points after each settled round.

**Group chart:** sum of all members' leg points per round, accumulated.  
**Separate stat:** cumulative acca £ P/L from `Round.profitLossGbp` (£10 theoretical stake).

**Important:** stats APIs compute from outcome + odds, not stale `pointsAwarded` (backfilled in migration `20260710000000_backfill_unit_stake_points`).

---

## Group summary (shipped)

**"Group stats"** section on group page via `group-stats.tsx`.

| Stat | Definition |
|------|------------|
| Total rounds | Settled round count |
| Total bets | Leg count in settled rounds |
| Average leg odds | Mean `Leg.odds` |
| Average acca odds | Mean `Round.combinedOdds` |
| Net group points | Sum of leg points (unit-stake formula) |
| Net acca P/L | Sum `profitLossGbp` |
| Win rate | % legs won |

**Chart:** cumulative group points vs round number/date (Recharts).

---

## Member stats (shipped)

| Stat | Definition |
|------|------------|
| Net points | Sum leg points (computed) |
| Legs played | Count in settled rounds |
| Win rate | Won / (won + lost) |
| Average odds | Mean `Leg.odds` |
| Best / worst leg | Max / min single-leg points |

**Multi-line chart:** each member's cumulative points over rounds.

### Favourites & best/worst

| Stat | Rule |
|------|------|
| Favourite competition / market / team | Mode by leg count |
| Best / worst competition / market / team | Highest / lowest net points |

- Team attribution: use `selectionLabel` when it matches a team name; exclude O/U/BTTS from team stats.
- Hide best/worst until ≥ 3 legs in category.

---

## API (as-built)

| Endpoint | Status |
|----------|--------|
| `GET /api/groups/[id]/stats` | ✅ Group summary + chart series |
| `GET /api/groups/[id]/members/[userId]/stats` | ✅ Member breakdown |

Compute on read. `Leg.pointsAwarded` is `Float`.

Key files: `apps/web/src/lib/stats/` — see [CURRENT_STATE.md](../CURRENT_STATE.md#stats).

---

## Implementation checklist

### Phase 1 — Points model ✅

- [x] `legPointsForOutcome(outcome, odds)` in shared package
- [x] Settlement + migration for float points
- [x] Leaderboard display update

### Phase 2 — Group charts ✅

- [x] Stats API + group summary UI
- [x] Cumulative points chart (Recharts)

### Phase 3 — Member breakdowns ✅

- [x] Multi-member chart
- [x] Favourites / best-worst (uses `competitionId`)

### Phase 4 — Polish ✅

- [x] Dashboard cross-group summary (`GET /api/user/stats`, `dashboard-stats.tsx`)
- [x] Share cards (`share-card.tsx` on dashboard + group page)

---

## Decisions (resolved)

| Question | Decision |
|----------|----------|
| Void = 0 points? | **Yes** |
| Reset vs backfill historical points? | **Backfill** — migration `20260710000000_backfill_unit_stake_points` |
| Decimal places on leaderboard? | Show up to 2 decimal places |

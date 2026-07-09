# Spec: Group stats & performance points

| Field | Value |
|-------|-------|
| **Status** | Phase 3 done; Phase 4 not built |
| **Depends on** | `competitionId` on legs for favourites (Phase 3) |
| **Replaces** | Flat points (+3 / +1 / 0) in `packages/shared/src/constants.ts` |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

Related: [competitions-and-results.md](./competitions-and-results.md)

---

## Goals

1. **Group performance hub** — summary + charts beyond leaderboard.
2. **Member profiles within group** — performance over time, favourites, best/worst picks.
3. **Unit-stake points** — chart metric that reflects betting P&L on a £1 leg stake.

---

## Performance points (target scoring)

| Outcome | Points |
|---------|--------|
| **Won** | `odds − 1` |
| **Lost** | `−1` |
| **Void** | `0` *(confirm at build)* |

Examples: win @ 2.50 → +1.50; loss → −1.00.

**Charts:** cumulative points after each settled round.

**Group chart (recommended):** sum of all members' leg points per round, accumulated.  
**Separate stat:** cumulative acca £ P/L from `Round.profitLossGbp` (£10 theoretical stake).

---

## Group summary (UI)

New **“Group stats”** section on group page.

| Stat | Definition |
|------|------------|
| Total rounds | Settled round count |
| Total bets | Leg count in settled rounds |
| Average leg odds | Mean `Leg.odds` |
| Average acca odds | Mean `Round.combinedOdds` |
| Net group points | Sum of leg points (new formula) |
| Net acca P/L | Sum `profitLossGbp` |
| Win rate | % legs won |

**Chart:** cumulative group points vs round number/date.

---

## Member stats (within group)

| Stat | Definition |
|------|------------|
| Net points | Sum `pointsAwarded` |
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

## API (planned)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/groups/[id]/stats` | Group summary + chart series |
| `GET /api/groups/[id]/members/[userId]/stats` | Member breakdown |

Compute on read initially. Schema change: `Leg.pointsAwarded` → `Float`.

---

## Implementation checklist

### Phase 1 — Points model

- [x] `legPointsForOutcome(outcome, odds)` in shared package
- [x] Settlement + migration for float points
- [x] Leaderboard display update

### Phase 2 — Group charts

- [x] Stats API + group summary UI
- [x] Cumulative points chart (Recharts or similar)

### Phase 3 — Member breakdowns

- [x] Multi-member chart
- [x] Favourites / best-worst (needs `competitionId`)

### Phase 4 — Polish

- [ ] Dashboard cross-group summary
- [ ] Share cards

---

## Open questions

1. Void = 0 points? **Yes** (implemented).
2. Reset vs backfill historical points on deploy? **Backfill** — migration `20260710000000_backfill_unit_stake_points`.
3. Decimal places on leaderboard?

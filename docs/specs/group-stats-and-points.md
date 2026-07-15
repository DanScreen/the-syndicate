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

| Outcome | Group | Member |
|---------|-------|--------|
| **Acca won** | `combinedOdds − 1` | `odds − 1` per won leg (`0` if void) |
| **Acca lost** | `−1` | Same per-leg rule: won → `odds − 1`, lost → `−1`, void → `0` |
| **Void leg** | Counts toward acca win; combined odds unchanged at lock | `0` |

Implementation: `groupAccaRoundPoints()` and `memberAccaLegPoints()` in `packages/shared/src/scoring.ts`.

Member totals on a winning acca **do not** sum to the group total (e.g. legs 1.6 + 2.15 → members 0.6 + 1.15, group 2.44). On a losing acca the group is −1 while members who won their pick keep `odds − 1`.

**Charts:** cumulative points after each settled round. In-progress leg outcomes on locked accas are visible on the Round tab but do not affect stats until the round settles. A losing leg settles the acca immediately (group −1; concluded legs score per-leg); later fixtures on that round keep resolving for individual outcomes/points.

**Group chart:** `combinedOdds − 1` per winning acca round, `−1` per losing acca round (one unit stake on the group acca).  
**Separate stat:** cumulative acca £ P/L from `Round.profitLossGbp` (£10 theoretical stake).

**Important:** stats APIs compute from outcome + odds, not stale `pointsAwarded` (backfilled in migration `20260712160000_member_leg_acca_points`).

---

## Group summary (shipped)

**"Group stats"** section on group page via `group-stats.tsx`.

| Stat | Definition |
|------|------------|
| Total rounds | Settled round count |
| Total bets | Leg count in settled rounds |
| Average leg odds | Mean `Leg.odds` |
| Average acca odds | Mean `Round.combinedOdds` |
| Net group points | Sum of group acca points per round (`combinedOdds − 1` on win, `−1` on loss) |
| Net acca P/L | Sum `profitLossGbp` |
| Win rate | % settled accas won |

**Chart:** cumulative group points vs round number/date (Recharts). Series prepend a **Start** point at 0 so the first settled round draws a line from zero.

---

## Member stats (shipped)

| Stat | Definition |
|------|------------|
| Net points | Sum of member leg points (`odds − 1` on won legs, `−1` on lost legs — including when the group acca loses) |
| Legs played | Count in settled rounds |
| Win rate | Won / (won + lost) |
| Average odds | Mean `Leg.odds` |
| Best / worst leg | Highest-odds **won** leg / lowest-odds **lost** leg (with fixture + pick) |

**Multi-line chart:** each member's cumulative points over rounds (anchored at 0 on the **Start** axis label).

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

- [x] Cross-group performance page (`GET /api/user/stats`, `/performance`, `dashboard-stats.tsx`)
- [x] Share cards (`share-card.tsx` on `/performance` + group Performance tab)

---

## Decisions (resolved)

| Question | Decision |
|----------|----------|
| Void = 0 points? | **Yes** |
| Reset vs backfill historical points? | **Backfill** — migration `20260710000000_backfill_unit_stake_points` |
| Decimal places on leaderboard? | Show up to 2 decimal places |

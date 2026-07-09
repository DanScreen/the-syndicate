# Group stats, social summaries & performance points — spec

Status: **spec only** (not yet implemented). Replaces the interim flat points system (`+3` win / `+1` void / `0` loss) when built.

Related: [COMPETITIONS_AND_RESULTS.md](./COMPETITIONS_AND_RESULTS.md), [PRODUCT.md](./PRODUCT.md).

---

## Goals

1. **Group performance hub** — each group gets a stats/summary section beyond the basic leaderboard.
2. **Individual member profiles within a group** — how each person performs over time.
3. **Charts over rounds** — visualise performance through time using a **unit-stake points** model that reflects betting P&L logic.
4. **Social flavour** — shared history members can compare, discuss, and rib each other about (favourites, best/worst picks, etc.).

---

## Performance points (new scoring model)

Assumes a **£1 unit stake** per leg (independent of the group acca’s theoretical £10 stake). Points represent **net return on that unit stake**.

| Outcome | Points | Meaning |
|---------|--------|---------|
| **Won** | `odds − 1` | Profit on a winning leg (e.g. odds 2.50 → **+1.50**) |
| **Lost** | `−1` | Stake lost |
| **Void** | `0` | Push / cancelled — no win or loss *(proposed; confirm at build)* |

### Examples

| Leg odds | Outcome | Points |
|----------|---------|--------|
| 1.80 | Won | +0.80 |
| 3.25 | Won | +2.25 |
| 2.00 | Lost | −1.00 |
| 4.50 | Lost | −1.00 |

### Cumulative performance

Charts plot **cumulative points** after each settled round:

```
memberPointsAfterRound[n] = memberPointsAfterRound[n-1] + legPointsForRound[n]
```

For a member who sits out a round (not possible in v1 — one leg per member per round), skip or hold flat.

Group-level points chart options (pick one at build — **recommended: sum of member leg points per round**):

| Approach | What it shows |
|----------|----------------|
| **A. Sum of member leg points** | Collective “syndicate skill” if all legs were £1 singles |
| **B. Round acca P/L in £** | Existing `Round.profitLossGbp` (theoretical £10 acca) — different scale |

**Recommendation:** Chart **A** for consistency with member charts; show acca **£ P/L** as a separate stat card (already on `Round.profitLossGbp`).

### Migration from current system

Today: flat `+3 / +1 / 0` from `POINTS` in `packages/shared/src/constants.ts`.

At implementation:

- [ ] Replace `pointsForOutcome()` to use `odds` on win and `−1` on loss.
- [ ] Backfill or reset `GroupMember.points`, `User.totalPoints`, `Leg.pointsAwarded` (product decision: fresh start vs recompute from history).
- [ ] Update leaderboard copy from “pts” to clarify unit-stake returns if needed.

---

## Group summary (UI)

New section on the group page (below active round / above or beside leaderboard): **“Group stats”**.

### Summary cards

| Stat | Definition |
|------|------------|
| **Total rounds** | Count of settled rounds |
| **Total legs / bets** | Sum of legs across settled rounds (= rounds × members, when full) |
| **Average leg odds** | Mean of `Leg.odds` across all settled legs in group |
| **Average acca odds** | Mean of `Round.combinedOdds` for settled rounds |
| **Net group points** | Sum of all member leg points (all time, this group) |
| **Net acca P/L** | Sum of `Round.profitLossGbp` (theoretical £10 accas) |
| **Win rate** | % of legs with outcome `won` |

### Group chart: performance over rounds

- **X-axis:** round number or settle date (settled rounds only, chronological).
- **Y-axis:** cumulative group points (sum of all members’ leg points that round, accumulated).
- Optional second series: cumulative `profitLossGbp` (acca £) on a separate axis or toggle.

```
Round 1: +2.1   → cumulative 2.1
Round 2: −0.5   → cumulative 1.6
Round 3: +4.0   → cumulative 5.6
```

---

## Individual member stats (within group)

Per-member panel or expandable row from leaderboard → **member detail**.

### Summary cards (per member, this group)

| Stat | Definition |
|------|------------|
| **Net points** | Sum of `pointsAwarded` (new formula) |
| **Legs played** | Count of legs in settled rounds |
| **Win rate** | Won / (won + lost), voids excluded |
| **Average odds** | Mean `Leg.odds` |
| **Best leg** | Highest single-leg points return |
| **Worst leg** | Lowest (most negative) single-leg points |

### Member chart: performance over rounds

- **Multi-line chart** on group stats page: one line per member, cumulative points after each settled round.
- Members with no leg in a round (future) — flat line segment.

### Favourites & best/worst breakdowns

Derived from settled legs only. Requires `competitionId` on leg (see [COMPETITIONS_AND_RESULTS.md](./COMPETITIONS_AND_RESULTS.md)) and existing `marketType`, team names on leg.

| Stat | Definition |
|------|------------|
| **Favourite competition** | Mode of `competition` / `competitionId` by leg count |
| **Favourite market** | Mode of `marketType` (display via `marketLabel`) |
| **Favourite team** | Team (`homeTeam` or `awayTeam`) most often involved in selections *(see team attribution below)* |
| **Best competition** | Competition with highest **net points** sum |
| **Worst competition** | Competition with lowest net points sum |
| **Best market** | Market type with highest net points sum |
| **Worst market** | Market type with lowest net points sum |
| **Best team** | Team with highest net points sum |
| **Worst team** | Team with lowest net points sum |

**Team attribution:** A leg “involves” the team(s) the selection relates to — e.g. match winner on Arsenal → Arsenal; BTTS on Chelsea vs Liverpool → both teams count as exposure, or only the selected outcome’s team. **Recommendation:** count the team named in `selectionLabel` when it matches `homeTeam`/`awayTeam`; for generic selections (Over 2.5), attribute to **fixture** not team, exclude from team favourites.

**Minimum sample:** Hide best/worst breakdowns until ≥ 3 legs in that category (avoid noise).

---

## Data & API (planned)

### Existing fields (reuse)

- `Leg`: `odds`, `outcome`, `pointsAwarded`, `marketType`, `marketLabel`, `competition`, `homeTeam`, `awayTeam`, `kickoff`
- `Round`: `combinedOdds`, `profitLossGbp`, `settledAt`, `status`
- `GroupMember`: `points` (group-scoped cumulative)

### New / changed (optional)

| Item | Purpose |
|------|---------|
| `Leg.competitionId` | Slug for aggregation (from competitions spec) |
| `Leg.teamId` or derived | Explicit team for favourites *(may derive at query time)* |
| `Round.groupPointsTotal` | Cached sum of leg points that round *(optional denormalisation)* |
| `GET /api/groups/[id]/stats` | Group summary + series for charts |
| `GET /api/groups/[id]/members/[userId]/stats` | Individual breakdown |

Most stats can be **computed on read** from settled legs initially; materialised views or cache if slow.

### Chart payload shape (example)

```json
{
  "group": {
    "totalRounds": 12,
    "totalLegs": 48,
    "averageLegOdds": 2.14,
    "averageAccaOdds": 8.32,
    "netPoints": 6.4,
    "netAccaPlGbp": -15.0,
    "winRate": 0.42,
    "pointsOverRounds": [
      { "roundId": "…", "settledAt": "…", "roundPoints": 1.2, "cumulativePoints": 3.5 }
    ]
  },
  "members": [
    {
      "userId": "…",
      "name": "…",
      "netPoints": 4.1,
      "favourites": { "competition": "epl", "market": "match_winner", "team": "Arsenal" },
      "bestWorst": { "competition": { "best": "world-cup", "worst": "epl" }, "…" },
      "pointsOverRounds": [
        { "roundId": "…", "legPoints": 0.8, "cumulativePoints": 2.1 }
      ]
    }
  ]
}
```

---

## UI / UX notes

- **Placement:** Tab or section “Stats” on group page alongside “Round” and “Leaderboard”.
- **Chart library:** Recharts or similar (lightweight, works in Next.js client components).
- **Empty states:** “Complete your first settled round to see stats.”
- **Leaderboard:** Sort by **net points** (new formula), show win rate and avg odds as secondary columns.
- **Social hooks (later):** Share card for “best round”, member of the month, streak badges — out of scope for v1 of this spec.

---

## Implementation phases

### Phase 1 — Points model

- [ ] New `legPointsForOutcome(outcome, odds)` in shared package
- [ ] Update settlement to store decimal points (schema: `pointsAwarded Float` migration)
- [ ] Update leaderboard display

### Phase 2 — Group summary + charts

- [ ] `GET /api/groups/[id]/stats`
- [ ] Group stats section + cumulative points chart
- [ ] Acca P/L chart or toggle

### Phase 3 — Member breakdowns

- [ ] Multi-member performance chart
- [ ] Per-member detail: favourites, best/worst
- [ ] Depends on `competitionId` from competition picker spec

### Phase 4 — Polish

- [ ] Dashboard cross-group summary for user
- [ ] Export / share stats image

---

## Open questions

1. **Void legs:** `0` points proposed — confirm.
2. **Historical data:** Reset points on deploy or recompute from settled legs + stored odds?
3. **Group chart:** Sum of member points vs acca £ P/L as primary — recommend member-points sum with acca £ as secondary.
4. **Team stats for O/U / BTTS:** Exclude from team favourites or split 50/50 between fixture teams?
5. **Decimal points on leaderboard:** Show one decimal place (e.g. `+4.2`) or two?

---

## Current vs future

| Concern | Today | After this spec |
|---------|-------|-----------------|
| Leg points | +3 / +1 / 0 flat | `odds−1` / `−1` / `0` |
| Group analytics | Leaderboard + round history list | Summary cards + charts |
| Member analytics | Points total only | Favourites, best/worst, time series |
| Chart metric | None | Cumulative unit-stake points |

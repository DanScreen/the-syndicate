# Spec: Streaks & badges (light gamification)

| Field | Value |
|-------|-------|
| **Status** | Backlog — after chat + live matchday; pairs with [seasons-and-public-leaderboards.md](./seasons-and-public-leaderboards.md) awards |
| **Depends on** | Stats helpers (shipped), settlement (shipped) |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) — Stats |

---

## Why

Market leaders (Pikkit, Betstamp, Sleeper) lean on streaks and status to drive habitual return. Tiki Acca's per-leg outcomes give a natural, honest streak mechanic — and badges surface identity ("the group's ballsy one") that fuels banter. Tone must stay **dry and football-flavoured, not casino-flavoured**: celebrate picking skill and group loyalty, never wagering volume or money staked.

## Goals

1. **Pick streaks** — consecutive won legs per member, shown live and at personal best.
2. **Badges** — a small, opinionated set of earned milestones on the member's stats page and leaderboard rows.
3. **Feed the social loop** — streak/badge moments post to the round thread ([group-chat.md](./group-chat.md)) and appear on share cards.

**Non-goals:** XP/levels/coins, daily-login rewards, badge marketplaces, anything rewarding bet frequency or stake size (responsible-gambling line — see below).

---

## Streaks

- **Definition:** consecutive settled legs with outcome `won` (void legs skip — neither extend nor break; matches scoring's void-neutral rule).
- **Compute on read** from the member's settled legs ordered by round settle time — same pattern as other stats; no stored counters v1.
- **Surfaces:** member breakdown ("Current streak: 4 🔥 · Best: 7"), leaderboard row flame at ≥3, group Performance member table.
- **Thread moment:** at streak 3/5/10, system message in the round thread: "{firstName} is on a 5-leg heater 🔥".

## Badge catalogue (v1 — keep it small)

| Badge | Earned by |
|-------|-----------|
| 🎯 First Blood | First won leg |
| 🔥 Heater | 5-leg win streak |
| 🍀 Ballsy | Winning leg at odds ≥ 5.0 |
| 🧊 Ice Cold | 5-leg losing streak (self-deprecating — banter fuel) |
| 🏆 Carried | Your leg was the highest-odds winner in a landed acca |
| 📅 Ever-Present | Picked in 10 consecutive group rounds |

Earned once, permanent, timestamped. Definitions live in `packages/shared` so web + mobile agree.

## Data model (proposed)

```prisma
model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badgeId   String   // slug from shared catalogue
  groupId   String?  // group-context badges (Carried, Ever-Present)
  earnedAt  DateTime @default(now())

  @@unique([userId, badgeId, groupId])
}
```

Badges are **awarded at settlement** (extend `applyRoundSettlement` / deferred-leg resolution) — evaluate catalogue rules for affected members, insert idempotently. Backfill migration awards historical badges from settled legs on ship.

## Build phases

### Phase 1 — streaks
- [ ] Streak computation in `lib/stats/helpers.ts` (void-skip rule)
- [ ] Member stats + leaderboard surfaces (web + mobile)
- [ ] Streak system messages (requires [group-chat.md](./group-chat.md) Phase 1)

### Phase 2 — badges
- [ ] Shared catalogue + `UserBadge` migration + settlement-time awarding + backfill
- [ ] Badge shelf on member breakdown; icons on leaderboard rows
- [ ] Badge-earned system message; badges on recap share card ([settle-recap-share.md](./settle-recap-share.md))

## Responsible-gambling guardrail

No badge or streak may reward **frequency, volume, or stake** (no "placed 100 bets", no "£X won"). Copy celebrates picks and group participation. Revisit this file's catalogue against this rule before adding any badge.

## Open questions

| Question | Recommendation |
|----------|----------------|
| Streaks per group or global? | **Global** (all groups) for the member page; leaderboard shows global too — simpler mental model |
| Notify on badge earn? | Thread system message only v1; no push |
| Seasonal badge resets? | No — badges permanent; seasons handle freshness ([seasons-and-public-leaderboards.md](./seasons-and-public-leaderboards.md)) |

## Related docs

[group-chat.md](./group-chat.md) · [seasons-and-public-leaderboards.md](./seasons-and-public-leaderboards.md) · [settle-recap-share.md](./settle-recap-share.md) · [group-stats-and-points.md](./group-stats-and-points.md)

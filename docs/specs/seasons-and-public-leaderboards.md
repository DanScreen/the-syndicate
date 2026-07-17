# Spec: Seasons, public leaderboards & monthly awards

| Field | Value |
|-------|-------|
| **Status** | Backlog — ship with/after 2026–27 season enablement ([season-readiness.md](./season-readiness.md)) |
| **Depends on** | Stats helpers (shipped), admin leaderboards (shipped), points scoring (shipped) |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) — Admin & analytics, Stats |

---

## Why

Public platform leaderboards are already backlogged ("open to all users when ready"), but a **perpetual** leaderboard punishes newcomers and goes stale — whoever joined first stays on top. Aligning leaderboards to **football seasons** gives everyone a fresh start each August, a natural re-engagement moment, and bragging rights that expire ("2026–27 champions"). Monthly group awards turn existing stats into shareable moments.

## Goals

1. **Season windows** — platform-defined date ranges ("World Cup 2026", "2026–27 Season") that scope leaderboards and stats filters.
2. **Public leaderboards** — groups + players ranked by points within the active season, visible to all signed-in users.
3. **Monthly group awards** — automatic per-group superlatives (top points, worst luck) at month end.
4. **All-time stays** — season boards are the default; all-time remains as a filter.

**Non-goals (v1):** prizes, promotion/relegation divisions, public (signed-out) leaderboard pages, per-competition leaderboards.

---

## Data model (proposed)

```prisma
model Season {
  id        String   @id @default(cuid())
  slug      String   @unique  // "2026-27", "world-cup-2026"
  name      String            // "2026–27 Season"
  startsAt  DateTime
  endsAt    DateTime
  createdAt DateTime @default(now())
}
```

No per-season denormalized points v1: season standings **compute on read** from settled rounds (`settledAt` within the window) using the same helpers as Performance (`groupAccaRoundPoints` / `memberAccaLegPoints`) — consistent with the live-recompute pattern in [group-stats-and-points.md](./group-stats-and-points.md). Add caching (60s in-memory or `unstable_cache`) if query cost bites; materialize a `SeasonStanding` table only if the user base outgrows on-read compute.

Admin CRUD for seasons: `/admin/seasons` (create/edit windows). Rounds don't reference seasons — membership is purely `settledAt` within window, so windows can be corrected retroactively.

## Public leaderboards

| Surface | Content |
|---------|---------|
| `/leaderboards` (new, session-protected) | Tabs: **Players** / **Groups**; season selector (default: active season); rank, name, points, W/L, legs |
| `/dashboard` | "Your rank this season: #12 of 84" teaser linking to `/leaderboards` |

Reuses `compute-platform-leaderboards.ts` logic with a season window parameter — but computed from settled rounds (not the all-time denormalized `User.totalPoints` columns, which stay admin/all-time only).

**Privacy:** leaderboards show `User.name` to all users. Ship with an `Account` toggle — "Show me on public leaderboards" (default **on**, anonymized as "Player #N" when off). Group boards show group name + owner first name only.

## Monthly awards

Computed per group at month end (extend an existing cron — e.g. first `sync-matches` run of the month — or compute on read for the previous month):

| Award | Basis (existing stats) |
|-------|------------------------|
| 🥇 Golden Boot | Most member points this month |
| 🎯 Sniper | Best pick win rate (min 3 legs) |
| 💀 Wooden Spoon | Most points lost |
| 🍀 Ballsiest | Highest odds winning leg |

- [ ] Awards panel on group Performance tab (month selector)
- [ ] Awards summary as a system message in the round thread ([group-chat.md](./group-chat.md)) + optional push
- [ ] Awards included in share cards ([settle-recap-share.md](./settle-recap-share.md) — monthly recap variant)

## Build phases

### Phase 1 — seasons + public leaderboards
- [ ] `Season` model + admin CRUD; seed "World Cup 2026" (retroactive) + "2026–27 Season"
- [ ] Season-windowed leaderboard compute (on-read from settled rounds)
- [ ] `/leaderboards` page + dashboard rank teaser + nav entry
- [ ] Leaderboard visibility toggle on `/account`

### Phase 2 — season filters + awards
- [ ] Season filter on `/performance` and group Performance tabs
- [ ] Monthly awards compute + group Performance panel
- [ ] Awards → round thread system message + share card variant

### Phase 3 — season wrap (later)
- [ ] End-of-season "wrapped" recap (email + share card): champion group/player, best pick of the season

## Open questions

| Question | Recommendation |
|----------|----------------|
| Season boundaries per competition? | No — one platform-wide window; overlapping cups count toward the season they settle in |
| Minimum activity to rank? | Yes — ≥5 settled legs to appear on player board (avoids 1-bet flukes topping it) |
| Mobile parity? | Yes, same release — leaderboards are a core member surface |

## Related docs

[platform-admin.md](./platform-admin.md) · [group-stats-and-points.md](./group-stats-and-points.md) · [season-readiness.md](./season-readiness.md) · [streaks-and-badges.md](./streaks-and-badges.md)

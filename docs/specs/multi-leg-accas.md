# Spec: Multi-leg accas (deferred)

| Field | Value |
|-------|-------|
| **Status** | **Deferred** — documented July 2026; do not build until core loop validated with real users |
| **Depends on** | Shipped one-leg acca loop, group settings pattern (not yet built) |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) — today: **one leg per member per round** (`@@unique([roundId, userId])`) |

---

## Decision (July 2026)

We **may** allow groups to run accas where each member contributes more than one leg, but:

1. **Not now** — priority remains validating the one-leg-each product with real groups ([ROADMAP.md](../ROADMAP.md)).
2. **Opt-in only** — default stays **1 leg per member**; multi-leg is a group-level setting chosen at create time or in group settings (exact UX TBD).
3. **Symmetric quota** — group owner picks **1, 2, or 3 legs per player**; **every member must submit the same number** before the round can lock. No mixed quotas within a group.
4. **Owner configures group format**; **platform admins set global ceilings** (abuse prevention, odds API cost).

**Why defer:** one leg each is the product wedge (accountability, fair contribution, simple lock/scoring). Multi-leg is useful for small groups wanting longer accas but changes schema, lock logic, UX, scoring fairness, and mobile parity.

---

## Product intent

| Use case | Why groups might want it |
|----------|--------------------------|
| Small group (3–4 mates) | Build a 6–9 leg Saturday acca without recruiting more members |
| Regular pub / office group | Same core crew, occasional bigger acca |
| Organiser-led group | Captain sets “2 legs each this week” for a cup final card |

**Brand guardrail:** even in multi-leg mode, preserve the “whose pick mattered?” moment — e.g. highlight each member’s **primary leg** on the round card and in banter-friendly copy.

---

## Group owner settings (proposed)

| Setting | Values | Notes |
|---------|--------|-------|
| `legsPerMember` | `1` (default) · `2` · `3` | Set by **group owner** when creating the group or in settings |
| Lock when | All members have submitted `legsPerMember` legs | Replaces today’s `legs.length >= members.length` |

**Rules:**

- `legsPerMember` is **fixed for the group** until the owner changes it (change applies to **future** rounds only; settled rounds unchanged).
- Members cannot submit more than their quota; UI shows progress (e.g. “Dan 2/2 · Tom 1/2”).
- Owner cannot lower `legsPerMember` mid-round if it would invalidate an open round (TBD: block or grandfather).

---

## Platform admin ceilings (proposed)

Global limits — not per-group micromanagement:

| Setting | Example default | Purpose |
|---------|-----------------|--------|
| `MULTI_LEG_ENABLED` | `false` until feature ships | Feature flag |
| `MAX_LEGS_PER_MEMBER` | `3` | Hard cap (matches owner options) |
| `MAX_LEGS_PER_ROUND` | `12` | Stops acca size / combined-odds explosion |
| `MAX_COMBINED_ODDS` | TBD (e.g. 50–100) | Reject lock if repriced acca exceeds ceiling |
| Per-group disable | Admin action | Escape hatch for abuse |

`maxMembers` (default 10) remains as today.

---

## Lock mechanics

**Today:** round locks when `legs.length >= group.members.length` ([`POST /api/legs`](../../apps/web/src/app/api/legs/route.ts)).

**Proposed:** round locks when **every member** has exactly `legsPerMember` legs in the round:

```
lock when: ∀ member ∈ group.members, count(legs where userId = member) = group.legsPerMember
```

Optional future extensions (not agreed July 2026):

- Owner manual close once minimum met
- Deadline lock at earliest kickoff among submitted legs

---

## Scoring & leaderboard (proposed)

Current scoring ([`packages/shared/src/scoring.ts`](../../packages/shared/src/scoring.ts)) awards member points **per leg** in a settled acca. Multi-leg is mechanically compatible but raises fairness questions (power users submit more high-odds legs).

**Recommended when built:**

| Area | Rule |
|------|------|
| Group acca points | Unchanged — one unit stake on combined acca (`combinedOdds − 1` win, `−1` loss) |
| Member points | Sum across all legs submitted (existing `memberAccaLegPoints` per leg) |
| Leaderboard emphasis | Surface **primary leg** (first submitted or designated slot) for accountability UX; full leg count in stats |

Open: whether leaderboard ranks on **all legs** or **primary leg only** — decide during implementation based on user feedback.

---

## Schema & API impact (when built)

| Area | Change |
|------|--------|
| `Group` | Add `legsPerMember Int @default(1)` (check `1..3`) |
| `Leg` | Remove `@@unique([roundId, userId])`; add `legIndex` (1..legsPerMember) with `@@unique([roundId, userId, legIndex])` |
| `POST /api/legs` | Accept `legIndex`; enforce quota; update lock condition |
| `PATCH /api/legs/[id]` | Edit rules unchanged (until first kickoff) |
| Web + mobile | Leg picker flow: submit N legs per member; round UI shows per-member progress |
| Stats | Member charts already sum per-leg points; verify multi-leg rounds |

---

## UX notes (sketch)

- Group create / settings: “Legs per member: 1 / 2 / 3” with short explanation (“Everyone submits the same number”).
- Round tab: per-member `submitted / quota` chips; acca card lists legs grouped by member.
- Lock email / notification: reflect total leg count.
- Marketing: default copy stays “one leg each”; multi-leg groups get no homepage change until validated.

---

## Build order (when prioritised)

Prerequisite: **success metric met** — real groups completing the one-leg loop on prod.

| Phase | Scope |
|-------|--------|
| 1 | Schema + `legsPerMember` on group; symmetric quota enforcement; lock condition |
| 2 | Web round UI (multi-submit, progress) |
| 3 | Mobile parity |
| 4 | Platform admin ceilings + feature flag |
| 5 | Leaderboard / stats polish (primary leg emphasis) |

Update [CURRENT_STATE.md](../CURRENT_STATE.md) and [PRODUCT.md](../PRODUCT.md) when Phase 1 ships.

---

## Open questions

- [ ] Can owner change `legsPerMember` with an open round in progress?
- [ ] Leaderboard: all legs vs primary leg only?
- [ ] Combined-odds ceiling value and UX when lock is rejected?
- [ ] Block same fixture twice in one acca (same member or group-wide)?
- [ ] Grandfather existing groups at `legsPerMember = 1` on migration?

---

## Related docs

- [PRODUCT.md](../PRODUCT.md) — core flow (one leg each today)
- [group-stats-and-points.md](./group-stats-and-points.md) — scoring model
- [ROADMAP.md](../ROADMAP.md) — deferred / post-validation

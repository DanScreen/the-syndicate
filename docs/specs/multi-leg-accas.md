# Spec: Multi-leg accas

| Field | Value |
|-------|-------|
| **Status** | **Shipped** (July 2026) — Phases 1–3 |
| **Depends on** | One-leg acca loop, group settings |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

---

## Decision (July 2026)

Groups can run accas where each member contributes more than one leg:

1. **Opt-in** — default stays **1 leg per member**; multi-leg is a group-level setting.
2. **Symmetric quota** — group owner picks **1, 2, or 3 legs per player**; every member must submit the same number before the round can lock (or kickoff locks a partial).
3. **Owner configures group format** at create time or in **Settings**.

---

## Shipped behaviour

| Setting | Values | Notes |
|---------|--------|-------|
| `Group.legsPerMember` | `1` (default) · `2` · `3` | Set by owner on create or `PATCH /api/groups/[id]` |
| `Round.legsPerMember` | Snapshot | Copied from group when the round opens — setting changes apply to **future** rounds only |
| Lock when | All members have ≥ `legsPerMember` legs | Or first-kickoff partial lock (unchanged) |

**Rules:**

- Members cannot submit more than their round quota; UI shows `submitted / quota` per member.
- Legs use `legIndex` (1-based) with `@@unique([roundId, userId, legIndex])`.
- Member points sum across all legs in the round (existing per-leg scoring).

---

## Build phases

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Schema + quota enforcement + lock condition | ✅ |
| 2 | Web create / settings / round multi-submit | ✅ |
| 3 | Mobile parity | ✅ |
| 4 | Platform admin ceilings + feature flag | Deferred |
| 5 | Leaderboard / stats polish (primary leg emphasis) | Deferred — ranks on all legs for now |

---

## Open questions (resolved for v1)

- [x] Can owner change `legsPerMember` with an open round? **Yes** — applies to **next** round only (round snapshot).
- [x] Leaderboard: all legs vs primary? **All legs** (sum).
- [ ] Combined-odds ceiling — not in v1.
- [ ] Block same fixture twice — not in v1.
- [x] Grandfather existing groups at `legsPerMember = 1` — migration default.

---

## Related docs

- [PRODUCT.md](../PRODUCT.md)
- [CURRENT_STATE.md](../CURRENT_STATE.md)
- [ROADMAP.md](../ROADMAP.md)

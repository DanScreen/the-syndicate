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
| `Round.legsPerMember` | Round quota | Set when the round opens; Settings updates it while `open` (before first kickoff). Locked / in-progress rounds unchanged. |
| Lock when | All members have ≥ `legsPerMember` legs | Or first-kickoff partial lock (unchanged) |

**Rules:**

- Members cannot submit more than their round quota; UI shows `submitted / quota` per member.
- Legs use `legIndex` (1-based) with `@@unique([roundId, userId, legIndex])`.
- Member points sum across all legs in the round (existing per-leg scoring).
- **No duplicate markets on the same fixture** — a round cannot include two legs that share a market family on the same match (e.g. Goals O/U 0.5 and O/U 1.5). Exact same pick is therefore also blocked. Helpers: `marketFamilyKey` / `findConflictingMarketLeg` / `findRedundantMarketLegs` in `packages/shared/src/market-conflicts.ts`. Historical cleanup: `purgeDuplicateMarketsInRound` + `fix-duplicate-markets` maintenance.

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

- [x] Can owner change `legsPerMember` with an open round? **Yes** — open rounds update immediately; locked / past-kickoff stay put. Lowering blocked if someone already exceeds the new quota.
- [x] Leaderboard: all legs vs primary? **All legs** (sum).
- [ ] Combined-odds ceiling — not in v1.
- [x] Block same fixture/market twice — **same market family on the same fixture** cannot appear twice in a round (e.g. Over 0.5 and Over 1.5 goals). Different fixtures OK. Enforced on `POST`/`PATCH` `/api/legs` + disabled in web/mobile pickers. Historical/open rounds are purged automatically; settled rounds via `fix-duplicate-markets` maintenance.
- [x] Grandfather existing groups at `legsPerMember = 1` — migration default.

---

## Related docs

- [PRODUCT.md](../PRODUCT.md)
- [CURRENT_STATE.md](../CURRENT_STATE.md)
- [ROADMAP.md](../ROADMAP.md)

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
| `Round.legsPerMember` | Bet quota | Set when the bet opens; Settings updates every eligible `open` bet (before first kickoff). Locked / in-progress bets unchanged. |
| Lock when | All members have ≥ `legsPerMember` legs | Or first-kickoff partial lock (unchanged) |

**Rules:**

- Members cannot submit more than their round quota; UI shows `submitted / quota` per member.
- Legs use `legIndex` (1-based) with `@@unique([roundId, userId, legIndex])`.
- Members can remove only their own legs while the round is still open and before first kickoff; replacement picks reuse the first free `legIndex`.
- Member points sum across all legs in the round (existing per-leg scoring).
- **One leg per fixture** — a round cannot include two legs from the same match, even across different markets. Same-match singles cannot be multiplied accurately because bookmakers apply correlation-aware bet-builder pricing and the current feed does not expose that combined quote. Enforced by `findConflictingFixtureLeg` in `packages/shared/src/market-conflicts.ts`; existing settled history is unchanged.

---

## Build phases

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Schema + quota enforcement + lock condition | ✅ |
| 2 | Web create / settings / round multi-submit | ✅ |
| 3 | Mobile parity | ✅ |
| 3b | Remove own open-round legs + chat event (web/mobile) | ✅ |
| 4 | Platform admin ceilings + feature flag | Deferred |
| 5 | Leaderboard / stats polish (primary leg emphasis) | Deferred — ranks on all legs for now |

---

## Open questions (resolved for v1)

- [x] Can owner change `legsPerMember` with an open round? **Yes** — open rounds update immediately; locked / past-kickoff stay put. Lowering blocked if someone already exceeds the new quota.
- [x] Leaderboard: all legs vs primary? **All legs** (sum).
- [ ] Combined-odds ceiling — not in v1.
- [x] Block multiple legs from one fixture — any second leg on the same match is rejected by `POST`/`PATCH` `/api/legs`; occupied fixtures are disabled in web/mobile pickers. This keeps combined odds valid without a bet-builder pricing feed. Existing settled rounds are not rewritten.
- [x] Grandfather existing groups at `legsPerMember = 1` — migration default.

Concurrent open/locked bets are specified separately in [concurrent-group-bets.md](./concurrent-group-bets.md); each bet enforces this quota independently.

---

## Related docs

- [PRODUCT.md](../PRODUCT.md)
- [CURRENT_STATE.md](../CURRENT_STATE.md)
- [ROADMAP.md](../ROADMAP.md)

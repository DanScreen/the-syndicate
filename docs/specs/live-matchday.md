# Spec: Live matchday (per-leg result push + live round view)

| Field | Value |
|-------|-------|
| **Status** | Backlog — extends [notifications.md](./notifications.md) Phase 3 |
| **Depends on** | Notifications dispatcher (shipped), progressive leg outcomes (shipped), match sync cron (shipped), mobile push credentials |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) — Settlement |

---

## Why

The peak emotional moment of the product is Saturday ~4:50pm when the acca is one leg from landing — and today the app is silent until the settle email. Leg outcomes already resolve progressively via the 5-min match sync; we compute the drama, we just don't tell anyone. This spec turns matchday into the app's flagship experience.

## Goals

1. **Per-leg result push** — "Leg 3 WON ⚽ — 2 to go" as each leg resolves, to all group members.
2. **Acca-won celebration push** — distinct from the settle receipt; fires the moment the last leg lands.
3. **Live round view** — the locked Round tab becomes a matchday tracker: live scores on each leg's fixture, running "state of the acca" summary.
4. **Copy that tells the story** — notifications reference whose pick it was ("Dan's BTTS landed 🔥"), feeding the banter loop ([group-chat.md](./group-chat.md)).

**Non-goals:** in-play betting or cash-out (product non-goals), goal-by-goal push (only *settled leg outcomes* notify; live scores are pull-only in the UI), sub-5-minute latency (bounded by match sync cron).

---

## Notifications (extends the catalogue in [notifications.md](./notifications.md))

| ID | Trigger | Channels | Recipient | Copy sketch |
|----|---------|----------|-----------|-------------|
| `leg_result` | Leg resolves while round still locked | Push only | All group members | Won: "{firstName}'s {selection} landed ✅ — {n} to go ({combinedOdds} acca)" · Lost: "{firstName}'s {selection} lost ❌ — acca busted" |
| `acca_won` | Settlement with all legs won/void | Push (+ optional email) | All group members | "ACCA LANDED 🎉 {combinedOdds} — {points} pts to the group" |

Implementation notes:

- **Trigger point:** `persistResolvableLegOutcomes()` — dispatch after the outcome transaction commits. `acca_won` from `applyRoundSettlement()` when the outcome is a win (the lost-path settle notification already exists).
- **Dedup:** `NotificationLog` type `leg_result:{legId}` — exactly-once per leg per user.
- **Ordering/batching:** multiple legs resolving in one sync run (simultaneous finishes) collapse to one push: "2 legs landed ✅✅ — 1 to go".
- **The lost case:** when a lost leg triggers early settle, send **either** `leg_result` (lost) **or** `round_settled`, not both — the settle notification carries the story ("{firstName}'s leg busted the acca at the last hurdle").
- **Preferences:** new `pushLegResult` toggle (default on), `pushAccaWon` folded into settled toggle. Quiet hours (11pm–8am, Europe/London) for `leg_result` only — late continental kickoffs; deliver on next morning sync? **No — drop silently**, the UI shows it.

## Live round view (web + mobile)

The locked Round tab already polls every 60s and shows Won/Lost/Awaiting badges. Add:

- [ ] **Live scores** on each leg's fixture row while in play (score + minute from football-data.org `Match` rows — check free-tier live coverage; if only FT results available, show "In play" state without score and revisit)
- [ ] **State-of-the-acca banner**: "3 of 5 legs landed — needs {teams} to hold on" derived from current outcomes
- [ ] **Poll faster while any leg is in play**: 30s during a live window (kickoff → ~2h after), reverting to 60s
- [ ] Leg rows ordered: in-play first, then upcoming, then resolved

## Build phases

### Phase 1 — per-leg push
- [ ] `leg_result` dispatch from `persistResolvableLegOutcomes` + batching + dedup
- [ ] `acca_won` dispatch from settlement win path
- [ ] `pushLegResult` preference + settings UI (web + mobile)
- [ ] Copy pass — name the picker, count remaining legs

### Phase 2 — live round view
- [ ] Match sync: capture in-play score/minute if free tier provides it
- [ ] Live fixture rows + acca banner + adaptive polling
- [ ] System messages for leg results into the round thread ([group-chat.md](./group-chat.md) — shared event source)

## Open questions

| Question | Recommendation |
|----------|----------------|
| Notify only the leg owner or whole group? | **Whole group** — the acca is shared; the drama is collective |
| football-data.org free tier live scores? | Verify during build; degrade to "In play" badge if unavailable |
| Push per goal? | No — outcome-settled only; goals belong to the (pull) live view |

## Related docs

[notifications.md](./notifications.md) · [group-chat.md](./group-chat.md) · [settle-recap-share.md](./settle-recap-share.md)

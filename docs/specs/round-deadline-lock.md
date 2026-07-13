# Spec: Round deadline lock & pick reminders

| Field | Value |
|-------|-------|
| **Status** | Phase 1 shipped (July 2026); Phase 2 (reminders) deferred |
| **Depends on** | Open rounds, leg kickoff snapshots, match sync cron |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

---

## Decision (July 2026)

An acca **locks when the earliest submitted leg kicks off**, even if not every member has picked. Members who miss the deadline are **not included** in that round's acca — partial accas are intentional accountability.

**Also locks when:** every member has submitted (existing behaviour).

**Reminders:** email/push nudges to members who haven't picked before the deadline — **deferred** (Phase 2 below).

---

## Lock rules (shipped)

| Trigger | Condition |
|---------|-----------|
| **Full submit** | `legs.length >= members.length` while round is `open` |
| **Kickoff deadline** | Round is `open`, at least one leg exists, and `min(leg.kickoff) <= now` |

**Not locked:** open round with **zero** legs (no kickoff anchor yet).

**After lock:**

- No new legs accepted (`POST /api/legs` → 403 if kickoff passed).
- Edits blocked after first kickoff (unchanged — `PATCH /api/legs/[id]`).
- Partial acca repriced and settled like any other locked round.
- Lock email notes how many members missed the deadline (if any).

---

## Implementation (Phase 1)

| Path | Role |
|------|------|
| `apps/web/src/lib/rounds/first-kickoff.ts` | `firstKickoff()`, `isPastKickoffCutoff()` |
| `apps/web/src/lib/rounds/claim-lock-round.ts` | Atomic `open → locked`, reprice, notify |
| `apps/web/src/lib/rounds/lock-open-rounds-at-kickoff.ts` | Batch lock for cron + group load |
| `POST /api/internal/sync-matches` | Runs `lockOpenRoundsAtKickoff()` every 5 min |
| `GET /api/groups/[id]` | Kickoff lock on round tab load (no cron wait) |
| `POST /api/legs` | Rejects submit after deadline; triggers lock if past kickoff |

**UI:** `RoundProgress` shows first-kickoff deadline and warns that missing members will be excluded (web + mobile).

---

## Phase 2 — Pick reminders (deferred)

**Goal:** reduce missed accas by nudging members who haven't submitted before the group's first kickoff.

### Proposed behaviour

| Event | Action |
|-------|--------|
| **T−24h** (optional) | Email to members without a leg in an open round that has ≥1 submitted leg |
| **T−2h** | Email to members still pending when `firstKickoff` is within 2 hours |
| **T−30m** (optional) | Final reminder |

**Recipients:** only group members who have **not** submitted a leg for the active open round.

**Content:** group name, deadline time, who has / hasn't submitted (or count), deep link to group round tab.

**Requires:**

- [ ] Cron job (e.g. extend `sync-matches` or new `POST /api/internal/round-reminders`) — at least hourly
- [ ] `Round.pickReminderSentAt` or per-member reminder log (avoid duplicate emails)
- [ ] Resend templates
- [ ] Optional: push notifications when mobile push ships ([ROADMAP.md](../ROADMAP.md) post-MVP)

**Open questions:**

- [ ] Remind when zero legs submitted yet? (No deadline anchor — skip until first leg in)
- [ ] Quiet hours / rate limits per user across groups?
- [ ] Opt-out per user?

---

## Related

- [PRODUCT.md](../PRODUCT.md) — build the acca flow
- [competitions-and-results.md](./competitions-and-results.md) — settlement, edit-until-kickoff
- [multi-leg-accas.md](./multi-leg-accas.md) — future symmetric multi-leg (separate from deadline lock)

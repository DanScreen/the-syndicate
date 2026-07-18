# Build plan: Group chat & reactions

Companion to [group-chat.md](./group-chat.md) — the execution sequence, which model runs each step, and the exact prompt to paste into Claude Code at the start of each session.

> Historical build sequence for Phases 1–2. The shipped Phase 3 design now uses
> one longstanding group-scoped Chat tab; see the main spec for current behaviour.

**Rules of engagement**

- One step = one fresh Claude Code session, started with `/model` set per the table. Fresh sessions force the model to onboard from repo docs (CURRENT_STATE.md → spec), not stale conversation.
- Commit at the end of each step before starting the next. Doc updates (spec checklist, CURRENT_STATE.md) belong in the same commit — [AGENTS.md](../../AGENTS.md) rules apply.
- Paste the prompt verbatim; it deliberately states the full scope up front.
- Check off steps here as they land.

| Step | Model | Scope | Status |
|------|-------|-------|--------|
| 1 | **Fable 5** | Schema, shared types, lifecycle system-message writes + tests | ✅ |
| 2 | **Opus 4.8** | Message APIs + web thread UI + History view | ✅ |
| 3 | **Opus 4.8** | Mobile parity | ✅ |
| 4 | **Opus 4.8** | Phase 2: reactions, unread, push | ✅ |
| 5 | **Fable 5** | Review + end-to-end verification | ☐ |

Why this split: Fable 5 builds the load-bearing skeleton (schema, transactional invariants) and reviews the finished diff; Opus 4.8 fills in the well-specified surface area at half the token price. Reviewing with a different model than the one that built each slice is deliberate.

---

## Step 1 — Fable 5 — data model, shared types, lifecycle writes

```text
Implement Step 1 of docs/specs/group-chat-build-plan.md: the foundation of the
group chat feature specced in docs/specs/group-chat.md.

Read docs/CURRENT_STATE.md first, then the spec in full.

Scope (and nothing beyond it):
1. Prisma migration for RoundMessage (including the optional legId link) and
   MessageReaction, per the spec's data-model section.
2. Shared Zod schemas/types in packages/shared for messages, reactions, the
   system-message eventType union, and the default emoji set.
3. System-message writes from the existing lifecycle code paths: leg submitted
   ("locked in") and leg changed (POST/PATCH /api/legs), round locked
   (claimAndLockRound), leg results (persistResolvableLegOutcomes), round
   settled (applyRoundSettlement).

Critical constraint: settlement and lock are exactly-once via atomic claims
(see CURRENT_STATE.md → Settlement). System-message inserts must not break
that — a retried or overlapping settle/lock must never double-post messages.
Write the inserts inside (or correctly gated on) the winning transaction, and
add tests that prove a retried settlement and a lock race produce exactly one
message each.

Do not build any API routes or UI in this step. When done: run the test
suite, update the Phase 1 checklist items you completed in
docs/specs/group-chat.md, update docs/CURRENT_STATE.md (new models, new
migration), and commit.
```

## Step 2 — Opus 4.8 — APIs + web thread UI

```text
Implement Step 2 of docs/specs/group-chat-build-plan.md: the message APIs and
web thread UI for the group chat feature specced in docs/specs/group-chat.md.

Read docs/CURRENT_STATE.md first, then the spec in full. Step 1 (schema,
shared types, lifecycle system-message writes) is already committed — build on
those types; do not modify the migration or lifecycle code.

Scope:
1. API routes per the spec: GET /api/rounds/[id]/messages (cursor-paginated,
   member-only), POST /api/rounds/[id]/messages (500-char limit, ~10/min/user
   rate limit via lib/rate-limit.ts), DELETE /api/messages/[id] (author or
   group owner; soft delete). Validate with the shared schemas.
2. Round tab thread UI (web): thread below the picks, input pinned at bottom,
   system messages styled distinctly from user messages, polling piggybacked
   on the existing group poll (tighten to 20s while the thread is visible).
3. History tab: read-only thread per settled round.

Match the surrounding code's conventions (group-ui.tsx, group-data context,
existing API route patterns). No reactions, unread badges, push, or mobile in
this step. When done: run the test suite and a local end-to-end check (post,
delete, see a system message appear on pick submit), update the spec
checklist and CURRENT_STATE.md (new routes, UI), and commit.
```

## Step 3 — Opus 4.8 — mobile parity

```text
Implement Step 3 of docs/specs/group-chat-build-plan.md: mobile parity for the
group chat thread specced in docs/specs/group-chat.md.

Read docs/CURRENT_STATE.md and apps/mobile conventions first (the "Change my
pick" flow is the parity pattern to imitate). Steps 1–2 are committed — the
API contract is fixed; do not change web or API code.

Scope: the Round-screen thread (user + system messages, input, polling) and
the read-only history thread in apps/mobile, functionally matching the web
implementation from Step 2. Reuse the shared types from packages/shared.

When done: verify in Expo Go against a local server (post a message from
mobile, see it on web and vice versa), update the spec checklist and
CURRENT_STATE.md (mobile parity note), and commit.
```

## Step 4 — Opus 4.8 — reactions, unread, push

```text
Implement Step 4 of docs/specs/group-chat-build-plan.md: Phase 2 of
docs/specs/group-chat.md — reactions, unread tracking, and chat push.

Read docs/CURRENT_STATE.md first, then the spec in full. Steps 1–3 are
committed.

Scope:
1. POST /api/messages/[id]/reactions — toggle semantics, validated single emoji
   set, member-only.
2. Reaction bar on chat messages (user + system) AND mirrored on betslip pick
   rows: the pick row displays/toggles reactions on the pick's LATEST
   leg_submitted/leg_changed system message, found via RoundMessage.legId.
   Reactions on superseded announcements stay with the old message. Web +
   mobile.
3. Unread tracking (GroupMember.lastReadMessageAt) with badges on the
   dashboard group cards and group tabs.
4. Batched chat_message push through the existing notification dispatcher
   (lib/notifications/): max one push per user per group per 10 minutes,
   suppressed for the sender, new pushChat preference (default on) in the
   NotificationPreference model and both settings UIs.

When done: run tests, verify the betslip mirror end-to-end (react on the
betslip, see it on the message in the thread; edit a pick, confirm old
reactions stay behind), update the spec checklist and CURRENT_STATE.md, and
commit.
```

## Step 5 — Fable 5 — review + verify

```text
The group chat feature (docs/specs/group-chat.md, built per
docs/specs/group-chat-build-plan.md Steps 1–4) is complete on this branch.
You did not write this code. Review and verify it before merge.

1. Run /code-review high on the full branch diff. Pay particular attention
   to: exactly-once semantics of system-message writes under settlement/lock
   retries; the reaction mirror resolving the correct (latest) announcement
   message after pick edits; rate-limit and auth checks on every new route
   (member-only access, author-or-owner delete); soft-delete behaviour; and
   push batching dedup.
2. Fix what the review finds, with tests where the defect class warrants one.
3. Then /verify end-to-end: create a group with two users, submit and edit
   picks, confirm announcement messages and reaction persistence across the
   edit, lock the round, confirm the locked system message and push, settle
   via the sync path, confirm settle messages appear exactly once.
4. Confirm docs match what shipped (spec checklists, CURRENT_STATE.md,
   ROADMAP.md) per AGENTS.md, then summarise remaining risks, if any.
```

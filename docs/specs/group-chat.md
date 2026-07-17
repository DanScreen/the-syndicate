# Spec: Group chat & reactions (banter thread)

| Field | Value |
|-------|-------|
| **Status** | Shipped (July 2026) |
| **Depends on** | Groups, rounds lifecycle, notifications dispatcher, mobile app |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |
| **Build plan** | [group-chat-build-plan.md](./group-chat-build-plan.md) — step sequence, model per step, session prompts |

---

## Why

The emotional product — trash talk when a mate's 9.0 correct-score pick lands, groans when a leg busts the acca — currently happens in WhatsApp, outside the app. Every successful social sports product (Sleeper, Stakemate, SBK) is chat/feed-first; chat is the single biggest gap between Tiki Acca and the market. Chat also gives the app a reason to open between matchdays.

## Goals

1. **Round-scoped banter thread** — one thread per round on the Round tab; history browsable per settled round.
2. **System messages give the thread a heartbeat** — lifecycle events we already generate (pick locked in / changed, acca locked, leg won/lost, settled) appear inline, so the thread is alive even when nobody types. Pick lock-ins are the flagship event ("Dan locked in BTTS @ 1.80 🔒").
3. **Emoji reactions on messages *and* picks — one mechanism** *(decision, July 2026)*: reactions attach to chat messages (user + system). Because every pick is announced by a system message, the **betslip row mirrors the reactions on its announcement message** — tapping a reaction on the betslip toggles it on the underlying message. Both surfaces, one data model. When a pick is edited, a new announcement is posted; reactions on the old pick stay with the old message (banter history preserved).
4. **Web + mobile parity** from v1 (mobile is where banter happens).

**Non-goals (v1):** DMs, cross-group chat, images/GIFs, voice, typing indicators, read receipts, WebSocket realtime (polling is fine — group already polls every 60s while locked), moderation tooling beyond delete-own + owner-delete.

---

## Data model (proposed)

```prisma
model RoundMessage {
  id        String   @id @default(cuid())
  roundId   String
  round     Round    @relation(fields: [roundId], references: [id], onDelete: Cascade)
  userId    String?  // null for system messages
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  kind      String   // "user" | "system"
  body      String   // user text (max 500 chars) or system event copy
  eventType String?  // system only: leg_submitted | leg_changed | round_locked | leg_result | round_settled
  legId     String?  // system pick events: the announced leg — lets the betslip row find its message
  leg       Leg?     @relation(fields: [legId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())

  @@index([roundId, createdAt])
  @@index([legId])
}

model MessageReaction {
  id        String       @id @default(cuid())
  messageId String
  message   RoundMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  emoji     String   // one Unicode emoji; defaults: 🔥 😂 💀 👀 🫡 🍀
  createdAt DateTime @default(now())

  @@unique([messageId, userId, emoji])
}
```

**One reaction model for both surfaces:** the betslip pick row displays/toggles reactions on the pick's *latest* `leg_submitted`/`leg_changed` system message (found via `legId`). No separate `LegReaction` table.

System messages are **written at event time** by the existing lifecycle code paths (leg submit/edit routes, `claimAndLockRound`, `persistResolvableLegOutcomes`, `applyRoundSettlement`) — not derived on read — so the thread is an append-only record.

## API routes (proposed)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/rounds/[id]/messages?after=<cursor>` | Member | Paginated thread (user + system), newest last |
| `POST /api/rounds/[id]/messages` | Member | Post message (500 chars; rate limit ~10/min/user) |
| `DELETE /api/messages/[id]` | Author or group owner | Delete (soft: body → "deleted") |
| `POST /api/messages/[id]/reactions` | Member | Toggle reaction `{ emoji }` (used by both chat and betslip surfaces) |

## UI

| Surface | Behaviour |
|---------|-----------|
| Round tab (web + mobile) | Thread below picks; input pinned at bottom; polls with the existing 60s group poll (tighten to 20s while thread visible) |
| Betslip pick rows | Reaction bar mirroring the pick's announcement message (tap to toggle; counts + who on long-press/hover) |
| Chat messages | Same reaction bar on every message (user + system) |
| History tab | Read-only thread per settled round ("relive the carnage") |
| Unread indicator | `GroupMember.lastReadMessageAt`; badge on group card on `/dashboard` and group tab |

## Notifications

Through the existing dispatcher ([notifications.md](./notifications.md)) — **push only**, no email:

- `chat_message` — batched: max one push per user per group per 10 min ("3 new messages in {group}"), suppressed while app foregrounded on that group. New `NotificationPreference` toggle (`pushChat`, default on).
- Reactions never notify (v1).

## Build phases

### Phase 1 — thread + system messages (core)
- [x] `RoundMessage` + `MessageReaction` migration (incl. `legId`) — `20260717150000_group_chat_messages`
- [x] Shared chat types/schemas — `packages/shared/src/chat.ts` (event types, emoji set, message/reaction Zod schemas, DTOs)
- [x] System message writes from lifecycle code paths (pick locked in / changed, round locked, leg results, settled) — `apps/web/src/lib/chat/system-messages.ts`; writes gated on the settlement/lock/leg atomic claims; exactly-once race tests in `apps/web/src/lib/chat/exactly-once.test.ts` (`npm test --workspace=@tiki-acca/web`)
- [x] Message APIs (`GET`/`POST` messages, `DELETE`) + rate limiting
- [x] Round tab thread UI (web), History read-only view
- [x] Mobile thread UI

### Phase 2 — reactions + unread + push
- [x] Reaction toggle API (`MessageReaction` table already migrated in Phase 1)
- [x] Reaction bar on chat messages + mirrored on betslip pick rows (web + mobile)
- [x] Unread tracking + dashboard badges
- [x] Batched `chat_message` push + preference toggle

## Open questions

| Question | Recommendation |
|----------|----------------|
| Group-scoped vs round-scoped thread? | **Round-scoped** — self-archiving, matches product rhythm; group-level feed can aggregate later |
| Profanity filtering? | No — private friend groups; owner-delete is the escape hatch |
| Realtime (WebSocket/SSE)? | Defer — polling piggybacks existing infra; revisit if chat takes off |
| Emoji choice? | Keep 🔥 😂 💀 👀 🫡 🍀 as one-tap defaults; `+` opens a broad emoji grid (popover on web, modal on mobile). The API accepts any single Unicode emoji. |

## Related docs

[notifications.md](./notifications.md) · [live-matchday.md](./live-matchday.md) · [mobile-apps.md](./mobile-apps.md)

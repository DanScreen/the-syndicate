# Solo accas — unlimited legs in a one-member group

**Status:** shipped (phases 1–3) · **Date:** 2026-07-28

## Problem

A group of one is already structurally valid — `claimAndLockRound`
(`apps/web/src/lib/rounds/claim-lock-round.ts`) has no member-count assumption,
and settlement, points, and `/performance` are all per-user. But solo is
effectively unusable today:

- `Group.legsPerMember` is `1 | 2 | 3` (`packages/shared/src/constants.ts:13`)
- The only proactive lock path is `allMembersFilledQuota`
  (`apps/web/src/app/api/legs/route.ts:161`)

So a solo group at the default quota of 1 **locks instantly on the first
submitted leg** — a one-leg "acca". At quota 3 it locks at three. A solo bettor
who wants a five- or eight-leg acca cannot build one.

This also leaves a cold-start hole: a new user with no mates lands on
`/dashboard` with "create a group → share a link → wait"
(`apps/web/src/app/dashboard/page.tsx:122-139`) and no way to use the product
alone.

## Goal

In a **one-member group**, let the member submit up to **10 legs** into a
single acca, and lock it themselves whenever they're ready.

Ten is the cap because most bookmakers limit accumulators to roughly 12–20
selections; a betslip deeplink beyond that is one the user cannot actually
place. The existing **one leg per fixture per round** rule is unchanged — it is
what keeps combined odds honest, and it bounds the acca by available fixtures
anyway.

## Design

### 1. Snapshot solo-ness on the round

```prisma
model Round {
  ...
  /// True when this round opened in a one-member group: quota is SOLO_MAX_LEGS
  /// and the member may lock manually.
  unlimitedLegs Boolean @default(false)
}
```

Set at round-open time when the group has exactly one member. Both creation
paths need it:

- `apps/web/src/lib/rounds/open-round.ts:36`
- `apps/web/src/lib/rounds/create-additional-round.ts:74`

Both already read the group to snapshot `legsPerMember`; extend those `select`s
with a member count.

**Why snapshot rather than derive from live member count:** it matches the
established pattern (`Round.legsPerMember` snapshots `Group.legsPerMember`, and
"locked / in-progress bets keep their quota" is already documented product
behaviour in [PRODUCT.md](../PRODUCT.md) §3.2).

An open round with 8 legs *does* end up with a quota of 1 the moment someone
joins — see the handover below. That is not the invalid state it first appears:
`allMembersFilledQuota` tests `>=`, so an over-quota member is simply already
done.

### 2. One shared quota helper

Add to `packages/shared/src/constants.ts`:

```ts
export const SOLO_MAX_LEGS = 10;
```

Add to `packages/shared/src/legs-quota.ts`:

```ts
/** Legs each member may submit in this round. */
export function effectiveLegQuota(round: {
  legsPerMember: number;
  unlimitedLegs?: boolean;
}): number {
  return round.unlimitedLegs ? SOLO_MAX_LEGS : round.legsPerMember;
}
```

This is the whole mechanic. `allMembersFilledQuota` and `membersMissingQuota`
need **no changes** — callers pass the effective quota instead of
`round.legsPerMember`. Three call sites:

| File | Line | Purpose |
|---|---|---|
| `apps/web/src/app/api/legs/route.ts` | 66 | Reject submission past quota |
| `apps/web/src/app/api/legs/route.ts` | 161 | Auto-lock on final submit |
| `apps/web/src/app/api/groups/[id]/route.ts` | 176 | Retry-lock on group load |

The fourth site (`groups/[id]/route.ts:435`, lock after a `legsPerMember`
settings change) is group-only and must **skip** unlimited rounds — changing
`legsPerMember` on a solo group's open round should not lock it.

Falling out of this for free: submitting the 10th leg auto-locks, exactly as
filling a quota does today.

### 3. Manual lock — the primitive that's missing

Auto-lock at 10 and the existing first-kickoff cutoff (`isPastKickoffCutoff`)
are both fallbacks. The **primary** solo path is locking a 4- or 6-leg acca
when you're done, because frozen combined odds and the best-combined-bookmaker
ranking are only computed at lock — and that's the thing the user needs before
placing the bet.

New endpoint: `POST /api/rounds/[id]/lock`

Guards (all required):

- caller is a member of the round's group
- `round.status === "open"`
- `round.unlimitedLegs === true`
- `round.legs.length >= 1`

Then call `claimAndLockRound(round.id)` — no new locking logic; it already
handles the atomic claim, repricing, chat message, and notification.

**Restricting this to unlimited (solo) rounds is deliberate.** In a
multi-member group, a manual lock lets one member lock everyone else out of
the acca. That is presumably why locking is quota-driven today, and this spec
does not change it.

### 3a. Handover when a second member joins

An earlier revision of this spec kept the flag set after a join and called it an
accepted edge case. That was wrong, and testing it showed why:

| Consequence | Why it matters |
|---|---|
| Quota stayed `SOLO_MAX_LEGS` **per member** | The acca could reach **2 x 10 = 20 legs** — past the selection limit bookmakers accept, defeating the entire reason the cap exists |
| Auto-lock needed *both* members at 10 legs | Effectively dead; the round could only lock manually or at kickoff |
| Manual lock is guarded on membership only | The member who just joined could lock the original member's acca out from under them |
| `RoundProgress` is gated on `!isSolo` | The member-progress list stayed hidden with two members, exactly when it becomes useful |

`POST /api/groups/join` therefore clears `unlimitedLegs` on every `open` round of
the group, in the **same transaction** as the `GroupMember` insert
(`convertSoloRoundsToGroup`, `apps/web/src/lib/rounds/convert-solo-rounds.ts`).

The round reverts to its snapshot `legsPerMember` for everyone. Legs the solo
member already submitted stand — `allMembersFilledQuota` tests `>=`, so they
count as done — and the acca locks as soon as the new member submits, through
the ordinary leg-submit path with no special-casing. `locked` and `settled`
rounds are left alone: neither the quota nor the manual-lock route consults the
flag once a round leaves `open`, so its value survives as a record of how the
acca was built.

Reads as a product behaviour: *someone joined your solo acca, so it's a group
acca now and locks once they've picked.*

### 4. UI — web + mobile

Where `legsPerMember > 1` currently drives copy, unlimited rounds need
different wording: there is no denominator to count towards.

| Surface | Today | Unlimited round |
|---|---|---|
| `apps/web/src/app/groups/[id]/page.tsx:306` | `Submit leg 2 of 3` | `Add leg 2` |
| `apps/web/src/app/groups/[id]/page.tsx:253` | `3 legs each this round` | `Build your acca — up to 10 legs` |
| `apps/mobile/src/components/group-round.tsx:181` | `2/3` | `2 legs` |

Plus a **Lock acca (N legs)** button on open unlimited rounds with ≥1 leg,
on both web and mobile. Disabled at 0 legs.

The member-progress list (`group-round.tsx:135`, "waiting on X members") is
meaningless with one member — suppress it on unlimited rounds rather than
rendering a one-row list.

### 5. Leaderboards — decision recorded

**Solo rounds count on shared leaderboards** (cross-group `/performance` and
the platform admin leaderboard). Decided 2026-07-28; no exclusion logic to
build.

> **Caveat, recorded so it isn't rediscovered later.** Points are awarded
> **per leg** (`pointsForMemberLeg`, `apps/web/src/lib/settlement.ts:6` — win
> `odds − 1`, loss `−1`) and increment `User.totalPoints`. A solo user
> submitting 10 legs a round therefore accumulates points up to ~10× faster
> than a group member submitting one, in either direction. Ranking by total
> points will favour solo volume. If shared leaderboards start looking
> distorted once there is real usage, the fix is a points-per-leg or
> average-based ranking rather than excluding solo rounds — that keeps solo
> players visible while removing the volume advantage. Not in scope here.

Group leaderboards are unaffected — a solo group has one member.

## Out of scope

The **solo on-ramp UX** — a "Start a solo acca" entry point on the dashboard
empty state, suppressing group furniture at one member, and an "invite your
mates" conversion CTA. That is the acquisition half of the idea and deserves
its own spec once this mechanic works. This spec only makes solo accas
*usable*; it does not surface them to new users.

## Test plan

`packages/shared/src/legs-quota.test.ts` + route tests:

1. `effectiveLegQuota` → `SOLO_MAX_LEGS` when `unlimitedLegs`, else
   `legsPerMember`.
2. Round opened in a one-member group gets `unlimitedLegs: true`; two-member
   group gets `false`. Both creation paths.
3. Solo round: legs 1–9 submit without locking; leg 10 auto-locks.
4. Solo round: leg 11 rejected with a cap message, round still locked.
5. `POST /api/rounds/[id]/lock` — locks at 1+ legs; 400 at 0 legs; 403 on a
   non-unlimited round; 403 for a non-member; 400 when not open.
6. Multi-member round behaviour byte-identical to today (regression pin).
7. `legsPerMember` settings change does not lock an open unlimited round.
8. First-kickoff cutoff still locks an unlimited round mid-build.
9. Join handover: flag cleared on `open` rounds; quota reverts to
   `legsPerMember`; over-quota legs stand; two members cannot exceed
   `SOLO_MAX_LEGS` between them; locks when the new member submits; `locked`
   rounds keep the flag; no-op for a group with no solo rounds; later rounds
   open normal.

## Delivery phases

| Phase | Scope | Ship gate | Status |
|---|---|---|---|
| 1 | Migration + `unlimitedLegs` snapshot at both creation paths + `effectiveLegQuota` + call sites | Tests 1–4, 6–8 green; multi-member behaviour unchanged | ✅ done |
| 2 | `POST /api/rounds/[id]/lock` | Test 5 green | ✅ code done, **route tests not written** |
| 3 | Web + mobile copy and Lock acca button | Manual run of a 5-leg solo acca end to end | ✅ code done, **not manually run** |
| 4 | Join handover (§3a) — clear the flag transactionally on join | Test 9 green (7 cases) | ✅ done |

**Verified on ship:** 48 shared + 62 web tests pass; `apps/web` and `apps/mobile`
typecheck clean; migration `20260728150000_round_unlimited_legs` applied locally.

**Known gaps (carry into the next session):**

- **Test 5 (the `POST /api/rounds/[id]/lock` route guards) was never written.** The
  endpoint's five guards — membership, `unlimitedLegs`, `open`, ≥1 leg, and the
  past-kickoff path — are covered by reading only. This is the least-tested part
  of the feature and the first thing to add.
- **No end-to-end run.** Phase 3's ship gate (build a 5-leg solo acca in the
  running app and lock it) has not been done. Types and unit tests pass; the UI
  itself is unexercised.
- `npm run lint` cannot run in this repo — `next lint` drops into an interactive
  ESLint setup prompt. Pre-existing, unrelated to this feature.

## Docs to update on ship

Per [AGENTS.md](../../AGENTS.md): [CURRENT_STATE.md](../CURRENT_STATE.md)
(new route, schema field), [PRODUCT.md](../PRODUCT.md) §3 (solo flow),
[ROADMAP.md](../ROADMAP.md), and this file's phase checklist.

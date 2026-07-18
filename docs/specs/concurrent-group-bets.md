# Spec: Concurrent group bets

| Field | Value |
|-------|-------|
| **Status** | Shipped on feature branch — pending owner testing |
| **Depends on** | Existing round lifecycle, group settings, round-scoped chat |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

## Goal

Let active groups prepare and track several accas at once without making the
single-bet default more complicated.

## Rules

- The group owner chooses `maxActiveBets` from 1–5 at group creation or in Settings.
- An active bet is a round whose status is `open` or `locked`; settled rounds do not count.
- The default remains 1, preserving the previous experience.
- When the limit is greater than 1, any group member may create a new bet.
- A new bet is rejected when the active limit has been reached.
- A new bet is also rejected while any existing open bet has zero legs.
- Each bet keeps its own quota snapshot, picks, odds, lifecycle messages, and chat thread.
- Lowering the limit below the current unresolved bet count saves immediately
  without cancelling bets. Existing bets continue; creation stays blocked until
  the active count falls below the new limit.
- Changes to legs per member apply to every eligible open bet; locked bets retain their snapshot.

## UI

- Web and mobile show an **Active Bets** switcher with stable `Bet #N` labels,
  status, and leg count.
- **New Bet** is disabled with an explanation when an empty open bet blocks creation.
- The switcher is hidden at the default limit of 1.
- Group cards show the number of active bets when more than one exists.
- Group creation and owner Settings expose the 1–5 selector on web and mobile.

## Concurrency and compatibility

- Creation and owner limit updates take a PostgreSQL transaction-level advisory
  lock keyed by group ID, making cap enforcement atomic.
- Existing rounds receive a group-scoped `betNumber` in migration
  `20260718190000_concurrent_group_bets`.
- Migration `20260718193000_concurrent_group_bets_constraints` adds a database
  `1–5` check and an active-round lookup index.
- `GET /api/groups/[id]` retains `activeRound` and top-level betslip fields for
  older clients while adding `activeRounds`, with betslip data scoped to each round.

## Verification

- [x] Limit 1 blocks manual creation
- [x] Empty open bet blocks creation
- [x] Non-owner member can create below the cap
- [x] Simultaneous requests cannot exceed the cap
- [x] Web and mobile TypeScript checks
- [x] Existing settlement/chat/odds regression suite
- [ ] Owner device/browser acceptance testing

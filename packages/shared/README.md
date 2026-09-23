# @tiki-acca/shared

Framework-agnostic types, schemas, and pure business logic shared between `apps/web` and `apps/mobile`. No React, no Prisma, no Next.js imports — anything here must run in both a browser/RN bundle and a Node server.

Everything is re-exported from `src/index.ts`; consumers import from `@tiki-acca/shared` rather than deep-importing individual files.

## Modules

- `types.ts`, `api-types.ts` — core domain types and the API response contract. Web routes check their output against these with `serialized(body) satisfies <X>Response`; both clients read them.
- `schemas.ts` — Zod validation schemas for API inputs.
- `constants.ts`, `roles.ts` — shared enums/constants (user roles, limits, etc.).
- `age.ts` — 18+ age-verification date math (see `age.test.ts`).
- `fixtures.ts` — football fixture/match helpers.
- `bookmakers.ts`, `bookmaker-branding.ts` — supported bookmaker list and their display branding (logos, colours).
- `market-groups.ts`, `market-conflicts.ts` — betting market grouping and the fixture-uniqueness/correlation rules that stop a user picking two conflicting legs from the same match (prose explanation in `docs/ARCHITECTURE.md`; the enforcement logic itself lives here).
- `acca.ts` — accumulator (multi-leg bet) helpers.
- `scoring.ts` — points/leaderboard scoring calculations.
- `legs-quota.ts` — per-round leg quota logic (how many picks a member owes).
- `round-status.ts` — round lifecycle/state derivation.
- `competitions.ts` — competition/league metadata.
- `chat.ts` — group chat message types and helpers (see `chat.test.ts`).
- `group-summary-display.ts` — formatting for group summary cards/notifications.
- `notification-types.ts` — push/email notification payload types.
- `profanity.ts` — chat message filtering.
- `brand.ts` — brand tokens (name, colours, `MEMBER_CHART_COLORS`) consumed by both apps and `scripts/brand/generate-brand-assets.mjs` / `scripts/brand/check-brand-sync.mjs`.
- `round-view.ts` — `deriveRoundView()`: everything the group Bet tab shows (selected bet, quota, edit window, banner, acca pricing, betslip rules), plus `accaSummaryCopy()`.
- `round-display.ts`, `stats-display.ts` — display helpers (kickoff format, outcome labels, chart labels, `filterUserStatsByGroup`, `buildShareText`).
- `copy.ts` — user-facing copy for both apps: `copy`, `COMPLIANCE` (responsible-gambling wording and helpline) and `NOTIFICATION_PREFERENCE_SECTIONS`.

## Testing

Co-located `*.test.ts` files run with `npm test --workspace=@tiki-acca/shared` (node:test via tsx), and in CI through the root `npm test`. New pure-logic modules with non-obvious edge cases should get a co-located `*.test.ts`.

## Adding a module

Add the file under `src/`, then add a corresponding `export * from "./<name>";` line in `src/index.ts` — nothing is exported automatically.

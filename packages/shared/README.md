# @tiki-acca/shared

Framework-agnostic types, schemas, and pure business logic shared between `apps/web` and `apps/mobile`. No React, no Prisma, no Next.js imports — anything here must run in both a browser/RN bundle and a Node server.

Everything is re-exported from `src/index.ts`; consumers import from `@tiki-acca/shared` rather than deep-importing individual files.

## Modules

- `types.ts`, `api-types.ts` — core domain types and the shapes of API request/response payloads.
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
- `brand.ts` — brand tokens (name, colours) consumed by both apps and `scripts/generate-brand-assets.mjs` / `scripts/check-brand-sync.mjs`.

## Testing

Co-located `*.test.ts` files (`age`, `bookmaker-branding`, `chat`, `group-summary-display`, `profanity`) run via the consuming app's test runner — see `apps/web/package.json`'s `test` script, which points directly at test files under `apps/web/src`. There is no standalone test runner in this package; new pure-logic modules with non-obvious edge cases should get a co-located `*.test.ts` following the same pattern.

## Adding a module

Add the file under `src/`, then add a corresponding `export * from "./<name>";` line in `src/index.ts` — nothing is exported automatically.

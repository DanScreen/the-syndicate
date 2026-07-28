# apps/web

Next.js 15 (App Router) web app for Tiki Acca — the group accumulator-betting product. Serves the marketing site, auth, dashboard, groups, and the JSON API consumed by both the web UI and `apps/mobile`.

For product/architecture context (data model, odds pipeline, settlement flow, chat, auth) see `docs/ARCHITECTURE.md` and `docs/CURRENT_STATE.md` at the repo root — this file covers only how the app is laid out and run.

## Layout

- `src/app/` — App Router routes. Page routes (`dashboard`, `groups`, `account`, `settings`, `admin`, `sign-in`/`sign-up`, `forgot-password`/`reset-password`, `blog`, `about`, `support`, legal pages) plus `src/app/api/` for route handlers (`auth`, `groups`, `legs`, `rounds`, `messages`, `competitions`, `fixtures`, `users`/`user`, `admin`, `analytics`, `internal`, `health`).
- `src/lib/` — server-side business logic, organized by domain. Each subdirectory is a slice of a subsystem described in `docs/ARCHITECTURE.md`:
  - `odds/` — third-party odds ingestion (`the-odds-api.ts`), market building/merging (`market-builders.ts`, `merge-markets.ts`, `event-markets.ts`), caching (`cache.ts`, `warm-cache.ts`, `odds-store.ts`), and a `mock-provider.ts` for local dev without hitting the real API.
  - `settlement/` — round settlement and outcome resolution (`auto-settle-round.ts`, `resolve-round-outcomes.ts`). Business-critical: settles bets and awards points, so changes here need care and a matching test.
  - `chat/`, `groups/`, `legs/`, `rounds/`, `competitions/`, `results/`, `stats/`, `share/`, `notifications/`, `admin/`, `brand/` — one directory per domain area, generally mirroring the API routes of the same name.
- `src/components/` — shared React components, including `analytics/` and `marketing/` subtrees.
- `src/context/` — React context providers.
- `src/types/` — web-app-specific types (cross-app types live in `@tiki-acca/shared`).
- `content/` — MDX content (blog posts, legal pages) rendered via `next-mdx-remote`.
- `scripts/data-maintenance.ts` — one-off/periodic data-maintenance script, run via `npm run db:maintenance`.

## Running locally

From the repo root (this app is part of the npm workspace):

```bash
cp apps/web/.env.example apps/web/.env.local
npm install
npm run dev   # starts apps/web via next dev --turbopack
```

See the root `README.md` for the full environment setup (database, mobile app, required env vars).

## Scripts

Run from this directory or via workspace-scoped `npm run <script> --workspace=apps/web` from the root:

- `dev` — `next dev --turbopack`
- `build` / `start` — production build/serve
- `lint` — `next lint`
- `test` — runs the Node test runner directly against the handful of `*.test.ts` files under `src/lib/` (analytics, chat exactly-once/group-scope/leg-removal, odds fixture-conflicts/merge-markets, round creation). There is no separate test framework config — new tests must be added to the file list in the `test` script in `package.json` to be picked up.
- `db:maintenance` — runs `scripts/data-maintenance.ts` via `tsx`.

## Odds and settlement — where to look before changing behavior

These two areas are the most algorithmically dense in the app and are comment-sparse relative to their complexity, so read `docs/ARCHITECTURE.md`'s "Odds" and "Settlement" sections first:

- Odds: `src/lib/odds/market-builders.ts` builds displayable markets from raw provider data; `src/lib/odds/merge-markets.ts` reconciles markets across snapshots; `packages/shared/src/market-conflicts.ts` (not in this app) enforces the fixture-uniqueness rule that stops correlated legs.
- Settlement: `src/lib/settlement/auto-settle-round.ts` is the entry point that atomically settles a round; `resolve-round-outcomes.ts` derives leg outcomes from match results.

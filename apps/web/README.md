# apps/web

Next.js 15 (App Router) web app for Tiki Acca — the group accumulator-betting product. Serves the marketing site, auth, dashboard, groups, and the JSON API consumed by both the web UI and `apps/mobile`.

For product/architecture context (data model, odds pipeline, settlement flow, chat, auth) see `docs/ARCHITECTURE.md` and `docs/CURRENT_STATE.md` at the repo root — this file covers only how the app is laid out and run.

## Layout

- `src/app/` — App Router routes. Page routes (`dashboard`, `groups`, `account`, `settings`, `admin`, `sign-in`/`sign-up`, `forgot-password`/`reset-password`, `blog`, `about`, `support`, legal pages) plus `src/app/api/` for route handlers (`auth`, `groups`, `legs`, `rounds`, `messages`, `competitions`, `fixtures`, `users`/`user`, `admin`, `analytics`, `internal`, `health`).
- `src/lib/` — server-side business logic, organized by domain. Each subdirectory is a slice of a subsystem described in `docs/ARCHITECTURE.md`:
  - `odds/` — third-party odds ingestion (`the-odds-api.ts`), market building/merging (`market-builders.ts`, `merge-markets.ts`, `event-markets.ts`), caching (`cache.ts`, `warm-cache.ts`, `odds-store.ts`), and a `mock-provider.ts` for local dev without hitting the real API.
  - `settlement/` — round settlement and outcome resolution (`auto-settle-round.ts`, `resolve-round-outcomes.ts`). Business-critical: settles bets and awards points, so changes here need care and a matching test.
  - `chat/`, `groups/`, `legs/`, `rounds/`, `competitions/`, `results/`, `stats/`, `share/`, `notifications/`, `admin/`, `brand/` — one directory per domain area, generally mirroring the API routes of the same name. `admin/auth.ts` holds `requireAdmin` / `ADMIN_EMAILS`; `settlement/points.ts` holds the per-leg points maths.
- `src/components/` — React components, grouped by area: `admin/` (admin screens), `group/` (group round, chat, history, stats, leaderboard), `layout/` (header, navs, tab bar, footer), `marketing/`, `analytics/`; cross-cutting pieces (logo, bookmaker logo, points text, share card) sit at the top level.
- `src/context/` — React context providers.
- `src/types/` — web-app-specific types (cross-app types live in `@tiki-acca/shared`).
- `content/` — MDX content (blog posts, legal pages) rendered via `next-mdx-remote`.
- `scripts/data-maintenance.ts` — one-off/periodic data-maintenance script, run via `npm run db:maintenance`.
- `scripts/generate-email-preview.ts` — renders every notification email to `scripts/preview-notification-emails.html` (git-ignored), run via `npm run email:preview`.

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
- `lint` — ESLint (`eslint.config.mjs`: `next/core-web-vitals` + `next/typescript`)
- `typecheck` — `tsc --noEmit`
- `test` — Node test runner over every `src/**/*.test.ts` (no extra framework config; new test files are picked up automatically). Some tests are integration tests against Postgres, so set `DATABASE_URL` (or `.env.local`) to a migrated database first.
- `test:e2e` — Playwright browser tests in `e2e/` against a production build on port 3100 and a wiped `tiki_acca_e2e` database. Needs Docker Postgres and `npx playwright install chromium`. See [CURRENT_STATE → Tests](../../docs/CURRENT_STATE.md#tests).
- `email:preview` — regenerates the notification email preview page.
- `db:maintenance` — runs `scripts/data-maintenance.ts` via `tsx`.

## Odds and settlement — where to look before changing behavior

These two areas are the most algorithmically dense in the app and are comment-sparse relative to their complexity, so read `docs/ARCHITECTURE.md`'s "Odds" and "Settlement" sections first:

- Odds: `src/lib/odds/market-builders.ts` builds displayable markets from raw provider data; `src/lib/odds/merge-markets.ts` reconciles markets across snapshots; `packages/shared/src/market-conflicts.ts` (not in this app) enforces the fixture-uniqueness rule that stops correlated legs.
- Settlement: `src/lib/settlement/auto-settle-round.ts` is the entry point that atomically settles a round; `resolve-round-outcomes.ts` derives leg outcomes from match results.

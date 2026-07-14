# Rename: The Syndicate → Tiki Acca

## Context

Rebrand the product from **The Syndicate** to **Tiki Acca** (tiki-taka pun: everyone touches the ball → each member adds one leg). The user owns `tikiacca.com` (Cloudflare, registered 2026-07-13); trademark checked clear; pre-launch with near-zero users makes this the cheapest possible moment. All work lands on a branch (`rename/tiki-acca`) and merging to `main` **is** the deploy/cutover moment, since pushes to main auto-deploy.

**Decisions (user-confirmed):**
- Groups are called **"groups"** (drop "syndicate" as the product noun — matches existing `/groups` routes and DB naming).
- **Full-depth rename** including npm scope `@the-syndicate/*` → `@tiki-acca/*` and local docker/dev DB names.
- **Never rename** (infra with data/state): GCP resources (Cloud SQL instance/DB `the_syndicate`, DB user `syndicate`, Cloud Run service `the-syndicate-web`, artifact repo, Terraform `name_prefix` in `locals.tf`), prod `DATABASE_URL` secret, GitHub repo name (optional later — GitHub auto-redirects), mobile SecureStore keys (`syndicate_token`/`syndicate_user`).
- Canonical new domain: **`https://www.tikiacca.com`** (mirrors current www-canonical + apex-301 pattern).

**Branch caution:** ~200 files touched. Freeze feature work on `main` while the branch is open; merge promptly.

## Workstreams

### A. Web brand copy + wordmark — DONE
- `apps/web/src/components/logo.tsx` — wordmark → `Tiki <span className="text-accent">Acca</span>`. **Acca-stack mark unchanged** (still on-brand: passes stacking into a move).
- `apps/web/src/app/layout.tsx` — titles/OG → "Tiki Acca — Social Group Accas", `metadataBase`/OG url → `https://www.tikiacca.com`.
- `apps/web/src/lib/marketing-content.ts` — brand mentions + noun swap ("Start a group", "Pub groups", FAQ "Is Tiki Acca a bookmaker?").
- Brand strings: `about/page.tsx`, `dashboard/page.tsx` ("Welcome to Tiki Acca"), `site-footer.tsx` (© + disclaimer), `notification-settings.tsx`, `lib/notifications/templates.ts` (email bodies), `lib/stats/compute-user-stats.ts` (share text + URL), `lib/share/render-performance-image.ts` ("TIKI ACCA" + URL drawn on image), `share-card.tsx` (download filename → `tiki-acca-performance.png`).
- Noun "syndicate"→"group" in UI strings: `dashboard-stats.tsx`, `platform-leaderboards.tsx` ("Group leaderboard"), `admin/leaderboards/page.tsx`, `settings/notifications/page.tsx`, `groups/[id]/history/page.tsx`, `page.tsx` (demo card "Saturday Squad" or similar), `packages/shared/src/group-summary-display.ts`, comments in `scoring.ts`/`api-types.ts`.
- TS identifiers: `SyndicateLeaderboardEntry`→`GroupLeaderboardEntry`, `syndicates`/`syndicateRows`/`syndicatePoints` → group-based names (`lib/admin/compute-platform-leaderboards.ts`, `dashboard/page.tsx`; check for collisions with existing `groupPoints` before renaming).

### B. Hardcoded domain literals (web) — DONE
`layout.tsx:18,33` · `lib/notifications/email.ts:46` (fallback) · `compute-user-stats.ts:230` · `render-performance-image.ts:200` → `www.tikiacca.com`.

### C. Mobile identity (free to change now — not in stores yet) — DONE
- `apps/mobile/app.json`: `name` "Tiki Acca", `slug` `tiki-acca`, `scheme` `tikiacca`, iOS `bundleIdentifier` + Android `package` → `com.tikiacca.app`, `associatedDomains` → `applinks:www.tikiacca.com`, Android intentFilter `host` → `www.tikiacca.com`, expo-router `origin`. If `extra.eas.projectId` exists, slug change may need `eas init` re-link — flag as manual step.
- `apps/mobile/eas.json`: 3× `EXPO_PUBLIC_API_URL` → `https://www.tikiacca.com`.
- Screens/copy: `sign-in.tsx`/`sign-up.tsx` titles, `src/lib/copy.ts`, `(main)/notifications.tsx`, `src/components/stats.tsx`, push channel name in `src/notifications/register.ts`.
- **Paired server change (same branch):** `apps/web/src/lib/notifications/round-notifications.ts:31` push deep link `tikiacca://`.
- `STORE_LISTING.md` rewrite (name, subtitle, description, keywords); mobile READMEs/testing docs.

### D. npm scope `@the-syndicate/*` → `@tiki-acca/*` — DONE
- `"name"` in 4 package.jsons + root `package.json` script `--workspace=` refs + `Dockerfile:25` + ~165 import statements (mechanical global replace) + check `next.config.ts` `transpilePackages`/tsconfig paths for scope references.
- `npm install` afterwards to rewrite `package-lock.json`.

### E. Local dev infra (dev-only; resets local DB data) — DONE
- `docker-compose.yml`: container `tiki-acca-db`, `POSTGRES_USER/PASSWORD/DB` → `tikiacca` / `tiki_acca`, volume rename.
- `Dockerfile` build-dummy `DATABASE_URL`; `.env.example` (web/mobile/database): DATABASE_URL, `EMAIL_FROM="Tiki Acca <notifications@tikiacca.com>"`; dev fallback secret in `lib/mobile-token.ts` (safe: real env always wins).
- Note for user post-merge: update local `.env.local`/`packages/database/.env`, `docker compose down && up`, re-migrate.

### F. Terraform / workflows (no resource recreation) — DONE
- `infra/terraform/environments/prod.tfvars`: `nextauth_url` → `https://www.tikiacca.com` (scheduler jobs derive `app_base_url` from it; they pass Cloudflare via the `/api/internal/*` origin-check exemption + CRON_SECRET — already safe).
- `prod.tfvars.example`, `iam.tf` display names (in-place safe). **Do not touch** `locals.tf name_prefix`, service/repo/DB name variables.
- `deploy.yml`/`terraform.yml`: no changes needed (defaults reference existing GCP names, which stay).

### G. Docs sweep — DONE
All of `docs/` (14 files), `AGENTS.md`, root `README.md`, `.cursor/rules/*.mdc`, `infra/terraform/README.md`, mobile docs: brand → Tiki Acca, domain → tikiacca.com, noun → group. `BRAND.md`: new wordmark/tagline table + rename record (date, rationale, what stays legacy). `MARKETING_BRIEF.md`: header note that brand renamed post-brief. New **DEPLOYMENT.md “Rename cutover runbook”** section (below). Document legacy internals (GCP names, prod DB, SecureStore keys) in CURRENT_STATE so future agents don't "fix" them.

## Cutover runbook (manual steps — user, at merge time)

**Pre-merge (safe any time):**
1. Cloudflare zone `tikiacca.com`: mirror current setup — proxied DNS to the same Cloud Run origin, `www` canonical + apex 301, **Transform Rule** `x-origin-auth` (same secret), WAF rate-limit rule on `/api/auth/*`.
2. Resend: verify `tikiacca.com` sending domain.
3. (Optional) register `tikiacca.uk`/`.co.uk`.

**At merge:** merge branch → immediately update GitHub **variables** `NEXTAUTH_URL=https://www.tikiacca.com` and `EMAIL_FROM=Tiki Acca <notifications@tikiacca.com>` → deploy auto-runs with new brand + URLs.

**Post-merge:**
4. Old zone `the-syndicate.uk`: bulk 301 → `https://www.tikiacca.com` preserving path+query (**keeps existing invite links working**).
5. Terraform CI apply picks up `nextauth_url` for scheduler (uses the GitHub `NEXTAUTH_URL` var).
6. Mobile: rebuild dev/test clients (new API URL + identity).
7. Sessions: host-scoped cookies → everyone re-signs-in once (acceptable at current scale).

## Verification (on the branch, before merge)

| # | Check | Status |
|---|-------|--------|
| 1 | `npm run build` (includes typecheck/lint) | **DONE** — green on `rename/tiki-acca` |
| 2 | Zero-leftovers grep (`syndicate` only allowlisted) | **DONE** — only GCP/SecureStore/docs chronicle/`archive.ts`/Terraform defaults |
| 3 | Boot local stack + drive full loop (mock odds): sign-up → group → invite → legs → lock → edit | **DONE** — mock server `:3010` (`ODDS_API_KEY=`): locked + repriced after edit. Admin settle skipped (test users not in `ADMIN_EMAILS`) |
| 4 | Headless screenshots: homepage / sign-in / about / header wordmark | **DONE** — `docs/brand/rename-verify/*.png` (Tiki Acca visible; no “The Syndicate”) |
| 5 | Email templates brand + `www.tikiacca.com` links | **DONE** — templates say Tiki Acca; `appBaseUrl()` fallback `https://www.tikiacca.com` |
| 6 | Push deep link `tikiacca://groups/...` matches `app.json` scheme | **DONE** — both `tikiacca` |

Allowed `syndicate` leftovers: GCP/Terraform resource names, SecureStore keys, migration/history notes, MARKETING_BRIEF/BRAND/DEPLOYMENT rename chronicle, `lib/brand/archive.ts`.

### Local notes after verification
- Docker compose DB `tiki-acca-db` / `tiki_acca` already running; migrations applied.
- Update personal `apps/web/.env.local` `EMAIL_FROM` to `Tiki Acca <notifications@tikiacca.com>` if still on the old address (not committed).
- **Merge cutover** still needs Cloudflare + GitHub variables — see runbook above (user).

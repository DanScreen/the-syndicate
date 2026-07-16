# Tiki Acca — Deployment Plan (Google Cloud Platform)

This document records our **intention** to host Tiki Acca on GCP with **continuous deployment from GitHub** on every push to `main`.

## Goals

1. Host the Next.js web app + API on **Cloud Run**
2. Store data in **Cloud SQL for PostgreSQL**
3. Store secrets in **Secret Manager**
4. Build and publish container images to **Artifact Registry**
5. Deploy automatically via **GitHub Actions** when `main` is updated
6. Keep the Expo mobile app separate (EAS builds); point it at the production API URL

## Target architecture

```mermaid
flowchart LR
  Dev[Developer] -->|push main| GitHub[GitHub]
  GitHub --> GHA[GitHub_Actions]
  GHA --> AR[Artifact_Registry]
  GHA --> Migrate[Prisma_migrate_deploy]
  GHA --> CR[Cloud_Run]
  CR --> SQL[Cloud_SQL_Postgres]
  CR --> SM[Secret_Manager]
  Mobile[Expo_iPhone] --> CR
```

## Planned code changes (this repo)

| Area | Change | Status |
|------|--------|--------|
| Database | Switch Prisma from SQLite → PostgreSQL | Done |
| Migrations | Replace `db:push` in prod with `prisma migrate deploy` | Done |
| Local dev | Add `docker-compose.yml` for Postgres | Done |
| Next.js | Enable `output: "standalone"` for containers | Done |
| Container | Add `Dockerfile` + `.dockerignore` | Done |
| CI/CD | Add `.github/workflows/deploy.yml` | Done |
| IaC | Add `infra/terraform/` for GCP resources | Done |
| IaC CI | Add `.github/workflows/terraform.yml` | Done |
| Health | Add `GET /api/health` for Cloud Run probes | Done |
| Security | Require `AUTH_SECRET` in production; tighten CORS | Done |
| Docs | Update README + ARCHITECTURE | Done |

## Infrastructure as Code (Terraform)

**All GCP infrastructure is defined in [`infra/terraform/`](../infra/terraform/).** Do not provision Cloud SQL, Scheduler jobs, service accounts, or other durable resources with ad-hoc `gcloud` commands — add or change Terraform instead, then apply via CI or locally.

GCP resources are reproducible across environments.

| Resource | Managed by |
|----------|------------|
| Cloud SQL, Artifact Registry, Secret Manager, IAM, WIF, **Cloud Scheduler** | **Terraform** |
| Docker image build + Cloud Run revision updates | **GitHub Actions** (`deploy.yml`) |
| Terraform plan/apply on `infra/` changes | **GitHub Actions** (`terraform.yml`) |

See [infra/terraform/README.md](../infra/terraform/README.md) for bootstrap, first apply, and GitHub configuration.

### First-time setup order

1. Create GCP project + billing
2. Create GCS state bucket (bootstrap — see Terraform README)
3. Run `terraform apply` locally (creates all infra + WIF)
4. Copy Terraform outputs into GitHub secrets/variables
5. Push app to `main` — `deploy.yml` builds and deploys the Docker image

> **Legacy resource names (intentional):** GCP resources predate the July 2026 rename to Tiki Acca and keep their original identifiers — Cloud SQL DB `the_syndicate` (user `syndicate`), Cloud Run service `the-syndicate-web`, artifact repo `the-syndicate`, Terraform `name_prefix`, state bucket. Renaming them would recreate infrastructure (and migrate data) for zero user value. Do not "fix" these.

## GCP resources (provisioned by Terraform)

These are created automatically by `infra/terraform/`:

1. **GCP APIs** — Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Cloud Scheduler, IAM, WIF
2. **Cloud SQL** — PostgreSQL 16 instance, database `the_syndicate`, app user
3. **Artifact Registry** — Docker repository (`the-syndicate`)
4. **Secret Manager** — `DATABASE_URL`, `AUTH_SECRET`, and `CRON_SECRET` (auto-generated unless supplied)
5. **Cloud Run** — `the-syndicate-web` service (placeholder image until app deploy)
6. **Cloud Scheduler** — `sync-matches` (every 5 min UTC) and `warm-odds-cache` (every 6 h UTC, optional)
7. **Service accounts** — Cloud Run runtime SA + GitHub deploy SA
8. **Workload Identity Federation** — passwordless GitHub Actions auth

### Manual steps no longer required

Terraform replaces the previous manual GCP setup checklist. Only the **GCS state bucket** bootstrap and **first local `terraform apply`** are done by hand.

### Cloud SQL connection from Cloud Run

Cloud Run attaches to Cloud SQL via Unix socket:

```
postgresql://USER:PASSWORD@localhost/the_syndicate?host=/cloudsql/PROJECT:REGION:INSTANCE
```

Deploy with:

```bash
gcloud run deploy the-syndicate-web \
  --image REGION-docker.pkg.dev/PROJECT/the-syndicate/web:TAG \
  --add-cloudsql-instances PROJECT:REGION:INSTANCE \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest \
  --set-env-vars NEXTAUTH_URL=https://your-domain.com,AUTH_TRUST_HOST=true,NODE_ENV=production
```

## Match results sync (Cloud Scheduler)

Auto-settle reads from the `Match` table. Populate it on a schedule.

**Managed by Terraform** ([`infra/terraform/scheduler.tf`](../infra/terraform/scheduler.tf)):

| Job | Schedule (UTC) | Endpoint |
|-----|----------------|----------|
| `sync-matches` | `*/5 * * * *` | `POST /api/internal/sync-matches` |
| `warm-odds-cache` | `0 */6 * * *` | `POST /api/internal/warm-odds-cache` |
| `round-reminders` | `*/15 * * * *` | `POST /api/internal/round-reminders` |

Both jobs send `Authorization: Bearer` with the `CRON_SECRET` value. **`CRON_SECRET` is owned by the app deploy workflow** (`deploy.yml` "Ensure CRON_SECRET" step creates/rotates it in Secret Manager so it exists before Cloud Run mounts it, independent of the Terraform workflow). Terraform *reads* it via a data source rather than managing it — this avoids the dual-ownership that previously caused `409 already exists` on `terraform apply`. The scheduler jobs get the bearer value from the `cron_secret` tfvar, not from the secret resource. `DATABASE_URL`/`AUTH_SECRET`, by contrast, are Terraform-owned. Override schedules or `app_base_url` via Terraform variables; see [infra/terraform/README.md](../infra/terraform/README.md).

Requires `FOOTBALL_DATA_API_KEY` on Cloud Run (via `deploy.yml`). Response includes `sync` and `autoSettle` results.

If you previously created `sync-matches` manually, **import** it into Terraform state before apply (see Terraform README).

## Odds cache warm (Cloud Scheduler)

Fixture and extended odds are stored in PostgreSQL (`OddsBulkSnapshot`, `OddsEventSnapshot`) so all Cloud Run instances share the same data. The Odds API is called by cron — not on every user pick when `ODDS_DB_ONLY=true`.

The **`warm-odds-cache`** job is created by Terraform alongside `sync-matches` (see table above). Optional Cloud Run env vars (set in `deploy.yml`): `ODDS_API_CACHE_TTL_MS` (snapshot TTL, default 30 min), `ODDS_WARM_CORE_WITHIN_HOURS` (default 72), `ODDS_DB_ONLY=true` (block live API on user requests).

See **[The Odds API — calls, credits & cron](#the-odds-api--calls-credits--cron)** below for the full call inventory and monthly budgeting.

Until the first cron run (or with `ODDS_DB_ONLY` unset), user traffic can still call the API directly as a fallback.

## The Odds API — calls, credits & cron

[The Odds API](https://the-odds-api.com/) bills in **credits**: each request costs `markets × regions` (one region = `uk` by default via `ODDS_API_REGIONS`).

**Match sync (`sync-matches`) does not use The Odds API** — it calls football-data.org only.

### Scheduled calls (production)

| Job | Schedule (UTC) | Route | Odds API? |
|-----|----------------|-------|-----------|
| `warm-odds-cache` | `0 */6 * * *` (every 6 h) | `POST /api/internal/warm-odds-cache` | **Yes** |
| `sync-matches` | `*/5 * * * *` (every 5 min) | `POST /api/internal/sync-matches` | No |

Terraform variable `warm_odds_cache_schedule` overrides the warm job schedule.

Each **`warm-odds-cache`** run (`apps/web/src/lib/odds/warm-cache.ts`), per **admin-enabled** competition:

1. **Bulk fixtures** — one `GET /sports/{sport}/odds` with markets `h2h,spreads,totals` → **3 credits** (3 markets × 1 region).
2. **Core extended markets** — one `GET /sports/{sport}/events/{id}/odds` per upcoming fixture kicking off within `ODDS_WARM_CORE_WITHIN_HOURS` (default **72 h**), markets `btts`, `double_chance`, `correct_score`, `alternate_spreads`, `alternate_totals` → **5 credits per fixture**.

**Specials** (corners & cards, 7 credits per fixture) are **not** warmed by cron — only fetched when a user clicks “Load more markets” (or on cache miss if `ODDS_DB_ONLY` is unset).

**Credits per warm run:**

```
3 × (enabled competitions)  +  5 × N
```

where `N` = upcoming fixtures in the warm window for that competition.

**Example (World Cup only, default schedule):** 4 runs/day. If `N = 8` fixtures in the 72 h window:

| Per run | Per day (×4) | Per month (×30) |
|---------|--------------|-----------------|
| 3 + 40 = **43** | **172** | **~5,160** |

With `N = 0` (no fixtures soon): **12 credits/day**, **~360/month**.

Tune `warm_odds_cache_schedule`, `ODDS_WARM_CORE_WITHIN_HOURS`, and enabled competitions in `/admin/competitions` to stay within your plan (free tier: 500 credits/month).

### User-facing calls (avoid in production)

When `ODDS_DB_ONLY=true` (recommended), user routes read PostgreSQL only — **zero** Odds API calls from picks, fixture lists, or lock.

When `ODDS_DB_ONLY` is unset/false, the app may call the API on cache miss:

| Trigger | Endpoint / code path | Credits |
|---------|----------------------|---------|
| Fixture list, no bulk snapshot | `refreshBulkFixturesFromApi` | **3** per competition |
| “Popular extras” tier, no snapshot | `refreshEventMarketsFromApi` tier `core` | **5** per fixture |
| “Corners & cards” tier | `refreshEventMarketsFromApi` tier `specials` | **7** per fixture |

Round **lock** re-reads quotes from the DB via `findSelection` — it does not call the API if snapshots exist.

### Admin / diagnostics

`GET /api/admin/odds-diagnostics` with “Probe API” performs live bulk fetches for debugging — costs the same as a bulk refresh (**3 credits** per probe). Use sparingly when quota is low.

### Recommended production settings

| Setting | Value | Why |
|---------|-------|-----|
| `ODDS_DB_ONLY` | `true` | Users never burn credits |
| `ODDS_WARM_CORE_WITHIN_HOURS` | `72` (or lower near tournament) | Limits per-fixture core warms |
| `warm_odds_cache_schedule` | `0 */6 * * *` or less frequent | Balance freshness vs quota |
| Enabled competitions | Minimum needed | Each adds **3 credits** per warm run |

Quota usage is visible on `/admin/odds` (from API response headers, cached in-memory).

## Email notifications (Resend)

Optional. When configured, members receive **email** on round lock, settle, and pick reminders; **push** when the mobile app has registered an Expo token.

1. Create account at [resend.com](https://resend.com) and verify sending domain.
2. Add `RESEND_API_KEY` to GitHub secrets.
3. Add `EMAIL_FROM` GitHub variable (e.g. `Tiki Acca <notifications@tikiacca.com>`).
4. Deploy — `deploy.yml` passes both to Cloud Run.

Optional: `EXPO_ACCESS_TOKEN` for Expo Push API rate limits (mobile push).

User preferences: `/account` (web), mobile Account screen. Legacy `/settings/notifications` redirects. Full spec: [specs/notifications.md](./specs/notifications.md).

Omit either email variable to skip emails (no-op).

Templates: Turf Green branded HTML in `apps/web/src/lib/notifications/templates.ts` + `email-layout.ts`. Logo asset: `apps/web/public/brand/email-logo.png` (served at `/brand/email-logo.png`). Local preview: `scripts/preview-notification-emails.html` (regenerate with `cd apps/web && npx tsx ../../scripts/generate-email-preview.ts`).

### Deliverability (avoid junk / spam)

Transactional mail still needs correct DNS and a warm reputation. Checklist:

| Step | Action |
|------|--------|
| 1. Custom domain | Send only from `*@tikiacca.com` via Resend — **not** `*.resend.dev` / onboarding addresses. `EMAIL_FROM` must match a verified domain. |
| 2. SPF + DKIM | In Resend → Domains → `tikiacca.com`, add the DNS records Resend shows. In Cloudflare DNS, create them as **DNS only** (grey cloud), not proxied. Wait until Resend shows the domain as **Verified**. |
| 3. DMARC | Add a TXT record at `_dmarc.tikiacca.com`, start gentle: `v=DMARC1; p=none; rua=mailto:you@tikiacca.com`. Tighten to `p=quarantine` once SPF/DKIM are clean for a few weeks. |
| 4. Alignment | From domain (`tikiacca.com`) must align with DKIM/SPF. Prefer `Tiki Acca <notifications@tikiacca.com>` (or `hello@` / `noreply@`) — avoid mismatched display domains. |
| 5. Headers we send | App includes `List-Unsubscribe` → `/account#notifications` and a plain-text part — both help Gmail/Outlook trust. |
| 6. Inbox tests | After DNS: send yourself a lock/settle email, then check [mail-tester.com](https://www.mail-tester.com) (aim ≥8/10) and Gmail “Show original” → SPF/DKIM/DMARC **PASS**. |
| 7. Recipient side | Ask friends to mark “Not spam” / move to Primary once; that trains their mailbox. New domains often land in junk for the first days — volume is low so warming is just: send real transactional mail, don’t blast. |

**Common failure:** Cloudflare orange-cloud on Resend TXT/CNAME records (breaks SPF/DKIM verification). Keep those records DNS-only.

**If still junk after PASS:** Resend dashboard → Domains → check reputation; confirm `EMAIL_FROM` on Cloud Run matches the verified domain; avoid link shorteners and tipster phrases in subjects (templates already avoid these).

## Platform admin

Grant developer access to `/admin` (overview + platform leaderboards).

1. Add `ADMIN_EMAILS` as a GitHub **secret** (comma-separated emails), e.g. `you@example.com,teammate@example.com`.  
   `deploy.yml` reads `secrets.ADMIN_EMAILS` (must match repo config — not `vars`).
2. Deploy — `deploy.yml` passes it to Cloud Run.
3. Each listed user signs in (or refreshes the page) — `User.role` is promoted and reflected in session automatically.
4. New sign-ups with a listed email are created as admin automatically.

**Local:** set `ADMIN_EMAILS` in `apps/web/.env.local` (see `.env.example`).

Full behaviour: [specs/platform-admin.md](./specs/platform-admin.md).

## GitHub repository configuration

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name |
| `GCP_SERVICE_ACCOUNT` | Deploy service account email |
| `CLOUD_SQL_CONNECTION_NAME` | `terraform output cloud_sql_connection_name` |
| `DATABASE_URL` | `terraform output -json github_actions_secrets` (for migration step) |
| `CRON_SECRET` | (Optional) Existing cron bearer — pass to Terraform on first apply to avoid rotation; stored in Secret Manager |
| `RESEND_API_KEY` | (Optional) Resend API key for email notifications |
| `ORIGIN_AUTH_SECRET` | (Optional) Cloudflare origin-auth shared secret — see [DDoS & abuse protection](#ddos--abuse-protection) |
| `TF_STATE_BUCKET` | GCS bucket for Terraform remote state |

### Variables

| Variable | Example |
|----------|---------|
| `GCP_REGION` | `europe-west2` |
| `ARTIFACT_REGISTRY_REPO` | `the-syndicate` |
| `CLOUD_RUN_SERVICE` | `the-syndicate-web` |
| `NEXTAUTH_URL` | `https://www.tikiacca.com` |
| `EMAIL_FROM` | `Tiki Acca <notifications@tikiacca.com>` (optional) |
| `ADMIN_EMAILS` | Comma-separated emails granted platform admin (GitHub **secret** in `deploy.yml`) |

## Deployment flow (on push to `main`)

1. Checkout code
2. Authenticate to GCP (Workload Identity Federation)
3. Build Docker image from repo root `Dockerfile`
4. Push image to Artifact Registry (`:sha` and `:latest` tags)
5. Run `prisma migrate deploy` against Cloud SQL (Auth Proxy in CI)
6. Deploy new revision to Cloud Run with secrets + Cloud SQL attachment
7. Cloud Run serves traffic on HTTPS

## Local development (after Postgres migration)

```bash
docker compose up -d          # start local Postgres
cp apps/web/.env.example apps/web/.env.local
cp packages/database/.env.example packages/database/.env
npm install
npm run db:migrate:deploy     # or db:migrate for new migrations
npm run dev
```

## Mobile apps (iOS and Android)

Mobile is **not** deployed by the web `deploy.yml` pipeline. Native apps are built separately with **Expo** and **[EAS Build](https://docs.expo.dev/build/introduction/)**.

**Strategy and parity plan:** [specs/mobile-apps.md](./specs/mobile-apps.md)

### Friend testing (without store fees)

**Decision (July 2026):** Defer Apple Developer (~£99/yr) and Google Play Console (~£25) until friend groups validate the full acca loop on production.

| Who | Channel | Cost |
|-----|---------|------|
| **Developer (you)** | Expo Go, Simulator, or `expo run:ios --device` on your iPhone | £0 |
| **Android mates** | Preview APK — `eas build --profile preview --platform android` | £0 store fee |
| **iPhone mates** | TestFlight after Apple Developer; web fallback only if needed | Deferred |
| **After validation** | `eas submit` to App Store / Play | Paid accounts |

Guides: [apps/mobile/DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md) · [apps/mobile/FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md)

### Architecture

- `apps/mobile` → `EXPO_PUBLIC_API_URL` → same Cloud Run API as web (`https://www.tikiacca.com`)
- Auth: `POST /api/auth/mobile/sign-in` → Bearer JWT on all API calls
- No direct database access from the app

### Local development

```bash
cd apps/mobile
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://localhost:3000 for local API
npm run ios            # or npm run android
```

### Production builds (EAS)

`eas.json` is configured in `apps/mobile/`. Full guide: [apps/mobile/README.md](../apps/mobile/README.md).

1. Install EAS CLI: `npm install -g eas-cli` and `eas login`
2. First time only: `cd apps/mobile && eas init` — copy the project UUID into `EAS_PROJECT_ID` in `.env` (or `apps/mobile/app.config.ts` reads it at build time)
3. Build (after friend validation, or Android APK anytime):

   ```bash
   cd apps/mobile
   eas build --profile preview --platform android   # friend APK — no store fee
   eas build --profile preview --platform ios       # needs Apple Developer
   eas build --profile production --platform all    # store binaries
   ```

4. Submit (**after** paid store accounts):

   ```bash
   eas submit --platform ios --profile production --latest
   eas submit --platform android --profile production --latest
   ```

| Setting | Value |
|---------|-------|
| iOS bundle ID | `com.tikiacca.app` |
| Android package | `com.tikiacca.app` |
| URL scheme | `tikiacca` |
| Production API | `EXPO_PUBLIC_API_URL=https://www.tikiacca.com` (in `eas.json` profiles) |

Store listing copy: [apps/mobile/STORE_LISTING.md](../apps/mobile/STORE_LISTING.md).  
Icons/splash: `apps/mobile/assets/` — export checklist in [BRAND.md](./BRAND.md#cross-platform-brand).

### CI

[`.github/workflows/eas.yml`](../.github/workflows/eas.yml) — manual **workflow_dispatch** or push tag `mobile-v*` (e.g. `mobile-v1.0.0`).

**GitHub secret:** `EXPO_TOKEN` (expo.dev → Access tokens).

### Universal links (optional)

`app.json` declares `associatedDomains` (iOS) and Android App Links for `https://www.tikiacca.com/groups/*`. For taps from Safari/Chrome to open the native app, host:

- `https://www.tikiacca.com/.well-known/apple-app-site-association`
- `https://www.tikiacca.com/.well-known/assetlinks.json`

Until those are live, use custom scheme links: `tikiacca://groups/join?code=`.

### Deep links

Custom scheme: `tikiacca` (`app.json`).

| URL | Route |
|-----|-------|
| `tikiacca://groups/join?code=INVITE` | Join group (stores code if signed out; pre-fills after sign-in) |
| `tikiacca://groups/{groupId}` | Open group round tab |

Test on simulator:

```bash
xcrun simctl openurl booted "tikiacca://groups/join?code=YOURCODE"
```

Universal links (`https://www.tikiacca.com/groups/join?code=`) open the website until associated domains are configured in Phase 5.

### CORS

Mobile uses Bearer tokens, not browser cookies. If API CORS is tightened, ensure mobile origins are not blocked for any Expo web preview; native apps are not subject to browser CORS.

## Cost optimization

GCP billing is typically dominated by **Cloud SQL** (~90% of forecast at current scale). Cloud Run with `min_instances = 0` is low cost.

### Check current spend

```bash
gcloud billing accounts list
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID
```

In GCP Console → **Billing → Reports**, filter by service to confirm Cloud SQL share.

### Terraform defaults (`infra/terraform/`)

| Resource | Default | Cost impact |
|----------|---------|-------------|
| Cloud SQL | `db-f1-micro`, zonal, Enterprise | Main cost driver |
| PITR | Enabled in prod (`cloud-sql.tf`) | Adds storage cost |
| Backups | Enabled | Retention affects storage |
| Cloud Run | `min_instances = 0` | Scales to zero |

### Options to reduce cost

1. **Verify tier** — ensure prod is not on a larger tier than `db-f1-micro`.
2. **Disable PITR** — if point-in-time recovery is not needed, set `point_in_time_recovery_enabled = false` in `cloud-sql.tf`.
3. **Reduce backup retention** — lower `backup_retention_days` if acceptable.
4. **Migrate database** — Neon, Supabase, or Railway can be cheaper at low traffic; requires `DATABASE_URL` change and connection string updates in deploy.
5. **Keep Cloud Run at min 0** — only raise `min_instances` if cold starts become a user-facing problem.

App deploy and match sync are unaffected by DB tier changes — only connection string and migration step need updating.

## Data maintenance (prod corrections)

One-off fixes (solo test rounds, re-settle after a bug) use `apps/web/scripts/data-maintenance.ts`. **Always preview first** (default dry-run); add `--execute` to apply.

### Connect to Cloud SQL locally

1. Install [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy).
2. Start the proxy (instance name from Terraform output):
   ```bash
   cloud-sql-proxy PROJECT:REGION:INSTANCE
   ```
3. Fetch prod `DATABASE_URL` from Secret Manager and point `localhost` at the proxy port (usually `5432`):
   ```bash
   export DATABASE_URL="$(gcloud secrets versions access latest --secret=DATABASE_URL)"
   # Edit host in the URL to localhost if the secret uses the Cloud SQL socket form
   ```

### Common tasks

| Goal | Commands |
|------|----------|
| List your solo test accas | `npm run db:maintenance -- preview-solo-rounds --email you@example.com` |
| Delete solo test accas + reverse points | `npm run db:maintenance -- remove-solo-rounds --email you@example.com --execute` |
| Find a round by fixture | `npm run db:maintenance -- find-rounds Norway England` |
| Preview outcome fix (e.g. draw mis-resolved) | Deploy orientation fix first, then `npm run db:maintenance -- preview-resettle --round-id <id>` |
| Re-settle a settled round | `npm run db:maintenance -- resettle-round --round-id <id> --execute` |
| Refresh Match scores from football-data (e.g. after 90-min fix) | `npm run db:maintenance -- resync-matches --execute` |
| Verify `User.totalPoints` / `GroupMember.points` | `npm run db:maintenance -- reconcile-points` then `--execute` if needed |
| Rescore member legs after scoring-rule change | `npm run db:maintenance -- rescore-member-legs` then `--execute` |
| Preview duplicate same-fixture markets | `npm run db:maintenance -- preview-duplicate-markets` |
| Fix historical duplicate markets (keep earliest leg) | `npm run db:maintenance -- fix-duplicate-markets --execute` |

**Solo round** = every leg in the round belongs to that email (typical single-player test accas).

**Re-settle** reverses the old settlement, re-resolves legs from synced `Match` rows (with correct home/away alignment), then runs the normal settlement path again. Deploy the orientation fix before re-settling Norway vs England.

---

## DDoS & abuse protection

Cloudflare proxies `www.tikiacca.com` and absorbs volumetric (L3/L4) attacks on every plan. Two additional layers close the remaining gaps:

### 1. Origin bypass protection (`ORIGIN_AUTH_SECRET`)

The Cloud Run service is publicly invokable (`INGRESS_TRAFFIC_ALL` + `allUsers`), so the default `*.run.app` URL would otherwise let attackers skip Cloudflare entirely. When `ORIGIN_AUTH_SECRET` is set, the app middleware serves only requests carrying a matching `x-origin-auth` header, which Cloudflare adds to proxied traffic.

**Setup (one-time):**

1. Generate a secret: `openssl rand -hex 32`.
2. Cloudflare dashboard → your zone → **Rules → Transform Rules → Modify Request Header** → create rule "Origin auth": *All incoming requests* → **Set static** header `x-origin-auth` = the secret. Deploy.
3. Add the same value as GitHub secret `ORIGIN_AUTH_SECRET` and push (or redeploy) — `deploy.yml` passes it to Cloud Run.

**Order matters:** create the Cloudflare rule *before* setting the GitHub secret, or real traffic 403s between the two steps. Unset secret = check disabled (local dev needs nothing).

**Exempt paths** (reachable without the header): `/api/health` (uptime checks) and `/api/internal/*` — Cloud Scheduler calls the `run.app` URL directly; those routes have their own `CRON_SECRET` bearer auth.

**Rotation:** update the Transform Rule value first, then the GitHub secret, then redeploy.

### 2. Auth rate limiting

App-level fixed-window limits (per instance, in-memory — `apps/web/src/lib/rate-limit.ts`; with `max_instances = 3` effective limits are up to 3×):

| Endpoint | Limit |
|----------|-------|
| Web sign-in (credentials `authorize`, before bcrypt) | 10 / 5 min / IP |
| `POST /api/auth/mobile/sign-in` | 10 / 5 min / IP (429 + `Retry-After`) |
| `POST /api/auth/sign-up` | 5 / hour / IP (429 + `Retry-After`) |

**Recommended Cloudflare rule (first line of defence):** zone → **Security → WAF → Rate limiting rules** (1 rule free): URI path starts with `/api/auth/` → 10 requests / 1 min per IP → Block for 1 min. This stops floods before they consume Cloud Run CPU at all.

**Residual risk (accepted at current scale):** a distributed L7 flood through Cloudflare can still saturate `max_instances = 3` and `db-f1-micro` — availability only, bounded cost. Revisit (Cloud Armor / bigger tiers) when real traffic justifies it.

## Rename cutover runbook (The Syndicate → Tiki Acca, July 2026)

Merging `rename/tiki-acca` into `main` deploys the new brand. Manual steps around the merge:

**Pre-merge (safe any time):**
1. Cloudflare zone `tikiacca.com`: proxied DNS to the same Cloud Run origin as the old zone, `www` canonical + apex 301, **Transform Rule** setting `x-origin-auth` (same `ORIGIN_AUTH_SECRET` value), WAF rate-limit rule on `/api/auth/*`.
2. Resend: verify `tikiacca.com` as a sending domain.
3. (Optional) register `tikiacca.uk` / `tikiacca.co.uk`.

**At merge:** merge branch → immediately update GitHub **variables** `NEXTAUTH_URL=https://www.tikiacca.com` and `EMAIL_FROM=Tiki Acca <notifications@tikiacca.com>` → the auto-deploy picks up brand + URLs together.

**Post-merge:**
4. Old zone `the-syndicate.uk`: bulk 301 → `https://www.tikiacca.com` preserving path + query (**keeps old invite links working**).
5. Terraform CI apply refreshes Cloud Scheduler targets (derives from the `NEXTAUTH_URL` variable).
6. Mobile: rebuild dev/test clients — new API URL, `tikiacca://` scheme, `com.tikiacca.app` identity. If EAS complains about the slug change (`tiki-acca`), re-link with `eas init`.
7. Local dev: update `.env.local` / `packages/database/.env` `DATABASE_URL` to `postgresql://tikiacca:tikiacca@localhost:5432/tiki_acca`, then `docker compose down && docker compose up -d && npm run db:migrate:deploy` (local DB data resets).
8. Sessions are host-scoped — everyone signs in again once. Expected.

## Future improvements

- Staging environment (deploy `develop` branch to separate Cloud Run service)
- Custom domain + Cloud DNS + managed SSL
- Cloud CDN in front of static assets
- Restrict CORS to known app origins (web + mobile)
- Cloud Run min instances > 0 to reduce cold starts
- Automated Cloud SQL backups and monitoring alerts

## Rollback

Cloud Run keeps previous revisions. Roll back instantly:

```bash
gcloud run services update-traffic the-syndicate-web --to-revisions REVISION=100
```

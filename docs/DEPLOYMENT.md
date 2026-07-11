# The Syndicate — Deployment Plan (Google Cloud Platform)

This document records our **intention** to host The Syndicate on GCP with **continuous deployment from GitHub** on every push to `main`.

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

Both jobs send `Authorization: Bearer` with the `CRON_SECRET` value from Secret Manager (created by Terraform). Override schedules or `app_base_url` via Terraform variables; see [infra/terraform/README.md](../infra/terraform/README.md).

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
2. **Core extended markets** — one `GET /sports/{sport}/events/{id}/odds` per upcoming fixture kicking off within `ODDS_WARM_CORE_WITHIN_HOURS` (default **72 h**), markets `btts,double_chance,correct_score` → **3 credits per fixture**.

**Specials** (corners & cards, 7 credits per fixture) are **not** warmed by cron — only fetched when a user clicks “Load more markets” (or on cache miss if `ODDS_DB_ONLY` is unset).

**Credits per warm run:**

```
3 × (enabled competitions)  +  3 × N
```

where `N` = upcoming fixtures in the warm window for that competition.

**Example (World Cup only, default schedule):** 4 runs/day. If `N = 8` fixtures in the 72 h window:

| Per run | Per day (×4) | Per month (×30) |
|---------|--------------|-----------------|
| 3 + 24 = **27** | **108** | **~3,240** |

With `N = 0` (no fixtures soon): **12 credits/day**, **~360/month**.

Tune `warm_odds_cache_schedule`, `ODDS_WARM_CORE_WITHIN_HOURS`, and enabled competitions in `/admin/competitions` to stay within your plan (free tier: 500 credits/month).

### User-facing calls (avoid in production)

When `ODDS_DB_ONLY=true` (recommended), user routes read PostgreSQL only — **zero** Odds API calls from picks, fixture lists, or lock.

When `ODDS_DB_ONLY` is unset/false, the app may call the API on cache miss:

| Trigger | Endpoint / code path | Credits |
|---------|----------------------|---------|
| Fixture list, no bulk snapshot | `refreshBulkFixturesFromApi` | **3** per competition |
| “Popular extras” tier, no snapshot | `refreshEventMarketsFromApi` tier `core` | **3** per fixture |
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

Optional. When configured, members receive email on round lock and settle.

1. Create account at [resend.com](https://resend.com) and verify sending domain.
2. Add `RESEND_API_KEY` to GitHub secrets.
3. Add `EMAIL_FROM` GitHub variable (e.g. `The Syndicate <notifications@the-syndicate.uk>`).
4. Deploy — `deploy.yml` passes both to Cloud Run.

Omit either variable to skip emails (no-op).

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
| `TF_STATE_BUCKET` | GCS bucket for Terraform remote state |

### Variables

| Variable | Example |
|----------|---------|
| `GCP_REGION` | `europe-west2` |
| `ARTIFACT_REGISTRY_REPO` | `the-syndicate` |
| `CLOUD_RUN_SERVICE` | `the-syndicate-web` |
| `NEXTAUTH_URL` | `https://the-syndicate.example.com` |
| `EMAIL_FROM` | `The Syndicate <notifications@the-syndicate.uk>` (optional) |
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

## Mobile app (production)

Mobile is **not** deployed by this pipeline. For production iPhone builds:

1. Set `EXPO_PUBLIC_API_URL` in EAS build profile to the Cloud Run URL (or custom domain)
2. Build with EAS → TestFlight → App Store

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

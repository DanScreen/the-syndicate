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

GCP resources are defined in [`infra/terraform/`](../infra/terraform/) and are reproducible across environments.

| Resource | Managed by |
|----------|------------|
| Cloud SQL, Artifact Registry, Secret Manager, IAM, WIF | **Terraform** |
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

1. **GCP APIs** — Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, IAM, WIF
2. **Cloud SQL** — PostgreSQL 16 instance, database `the_syndicate`, app user
3. **Artifact Registry** — Docker repository (`the-syndicate`)
4. **Secret Manager** — `DATABASE_URL` and `AUTH_SECRET` (auto-generated)
5. **Cloud Run** — `the-syndicate-web` service (placeholder image until app deploy)
6. **Service accounts** — Cloud Run runtime SA + GitHub deploy SA
7. **Workload Identity Federation** — passwordless GitHub Actions auth

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

Auto-settle reads from the `Match` table. Populate it on a schedule:

1. Create `CRON_SECRET` in Secret Manager (long random string).
2. Add `CRON_SECRET` to GitHub secrets and Cloud Run deploy (`deploy.yml`).
3. Create a Cloud Scheduler job (every 5 minutes):

```bash
gcloud scheduler jobs create http sync-matches \
  --location=europe-west2 \
  --schedule="*/5 * * * *" \
  --uri="https://www.the-syndicate.uk/api/internal/sync-matches" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_CRON_SECRET"
```

Production job: `sync-matches` in `europe-west2`, schedule `*/5 * * * *` (UTC).

Requires `FOOTBALL_DATA_API_KEY` on Cloud Run. Response includes `sync` and `autoSettle` results.

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
| `CRON_SECRET` | Long random string for `/api/internal/sync-matches` |
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

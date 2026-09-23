# Workflows

Five GitHub Actions workflows. Deploy/infra details live in `docs/DEPLOYMENT.md`; this is just the at-a-glance index.

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Every PR, and push to `main` | Lint (web/mobile/client), typecheck (web/mobile/shared/client), migrations and tests against a Postgres service container. No secrets. |
| `deploy.yml` | Push to `main` touching `apps/web/**` or `packages/**` | Builds and deploys the web app to Cloud Run. |
| `terraform.yml` | Push/PR touching `infra/terraform/**`, or manual | Plans (PR) / applies (push to `main`) the Terraform infra. See `infra/terraform/README.md`. |
| `eas.yml` | Push to `main` that changes `expo.version` in `apps/mobile/app.json`, or manual (`workflow_dispatch`: platform, profile, optional submit) | On a version bump: production EAS build + `--auto-submit` to the stores (platforms from repo variable `MOBILE_RELEASE_PLATFORMS`, default `ios`). Other pushes don't build — JS-only changes ship via `eas update`. See `apps/mobile/README.md` → CI. |
| `seed-demo.yml` | Manual only | (Re)seeds the production database with the marketing/App Store-reviewer demo account ("The Thursday Club", login `danny@demo.tikiacca.com`). Idempotent — safe to re-run. Never runs on push or as part of `deploy.yml`. Runs `npm run marketing:seed` (`tools/marketing/seeds/demo-seed.ts`) against production via the Cloud SQL proxy. |

## Secrets used across these workflows

`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `DATABASE_URL`, `CLOUD_SQL_CONNECTION_NAME`, `TF_STATE_BUCKET`, `ORIGIN_AUTH_SECRET`, `CRON_SECRET`, `EXPO_TOKEN` — configured as repo/environment secrets, not committed anywhere. See `docs/DEPLOYMENT.md` for what each backs.

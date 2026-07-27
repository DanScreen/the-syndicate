# Workflows

Four GitHub Actions workflows. Deploy/infra details live in `docs/DEPLOYMENT.md`; this is just the at-a-glance index.

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy.yml` | Push to `main` touching `apps/web/**` or `packages/**` | Builds and deploys the web app to Cloud Run. |
| `terraform.yml` | Push/PR touching `infra/terraform/**`, or manual | Plans (PR) / applies (push to `main`) the Terraform infra. See `infra/terraform/README.md`. |
| `eas.yml` | Manual (`workflow_dispatch`, choose `ios`/`android`/`all`), or push of a `mobile-v*` tag | Triggers an EAS build for the mobile app. Tags are created by `apps/mobile`'s release tooling — see `apps/mobile/README.md`. |
| `seed-demo.yml` | Manual only | (Re)seeds the production database with the marketing/App Store-reviewer demo account ("The Thursday Club", login `danny@demo.tikiacca.com`). Idempotent — safe to re-run. Never runs on push or as part of `deploy.yml`. Runs `packages/database/prisma/demo-seed.ts` against production via the Cloud SQL proxy. |

## Secrets used across these workflows

`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `DATABASE_URL`, `CLOUD_SQL_CONNECTION_NAME`, `TF_STATE_BUCKET`, `ORIGIN_AUTH_SECRET`, `CRON_SECRET`, `EXPO_TOKEN` — configured as repo/environment secrets, not committed anywhere. See `docs/DEPLOYMENT.md` for what each backs.

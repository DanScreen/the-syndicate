# Terraform

Provisions GCP infrastructure for **Tiki Acca** as reproducible Infrastructure as Code.

**Policy:** All durable GCP infrastructure (Cloud SQL, Cloud Run service shell, Secret Manager, IAM, Workload Identity Federation, **Cloud Scheduler**, and related APIs) must be defined in this directory — not created with one-off `gcloud` commands. Application **releases** (Docker image, migrations, runtime env vars for API keys) stay in [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).

## What this creates

| Resource | Purpose |
|----------|---------|
| Enabled GCP APIs | Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Cloud Scheduler, IAM, WIF |
| Cloud SQL (PostgreSQL 16) | Application database |
| Artifact Registry | Docker image storage |
| Secret Manager | `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET` (auto-generated unless supplied) |
| Cloud Run service | Web + API (placeholder image until app deploy) |
| Cloud Scheduler | `sync-matches` (every 5 min) and `warm-odds-cache` (every 6 h, optional) |
| Service accounts | Runtime SA + GitHub deploy SA |
| Workload Identity Federation | Passwordless GitHub Actions → GCP auth |

App code deployment remains in [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml). Terraform manages **infrastructure**; GitHub Actions manages **application releases**.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) authenticated
- A GCP project with billing enabled
- Permission to create resources in the project

## Bootstrap (one-time)

### 1. Create a GCS bucket for Terraform state

```bash
export PROJECT_ID="your-gcp-project-id"
export STATE_BUCKET="the-syndicate-terraform-state"

gcloud storage buckets create "gs://${STATE_BUCKET}" \
  --project="${PROJECT_ID}" \
  --location=europe-west2 \
  --uniform-bucket-level-access

gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning
```

### 2. Enable remote state

Uncomment the `backend "gcs"` block in [`versions.tf`](versions.tf), set your bucket name, then:

```bash
terraform init -migrate-state
```

### 3. Configure variables

```bash
cp environments/prod.tfvars.example environments/prod.tfvars
# Edit prod.tfvars with your project_id and github_repository
```

## Apply

```bash
cd infra/terraform
terraform init
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## Configure GitHub Actions

After `terraform apply`, read outputs:

```bash
terraform output github_deploy_service_account
terraform output workload_identity_provider
terraform output cloud_sql_connection_name
terraform output -json github_actions_secrets
```

Set these as **GitHub repository secrets**:

| Secret | Source |
|--------|--------|
| `GCP_PROJECT_ID` | `terraform output project_id` |
| `GCP_SERVICE_ACCOUNT` | `terraform output github_deploy_service_account` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `terraform output workload_identity_provider` |
| `CLOUD_SQL_CONNECTION_NAME` | `terraform output cloud_sql_connection_name` |
| `DATABASE_URL` | `terraform output -json github_actions_secrets` (migration step) |
| `CRON_SECRET` | (Optional) Existing cron bearer token — pass on first apply so Terraform stores it in Secret Manager without rotating. Omit to auto-generate. |

Set these as **GitHub repository variables**:

| Variable | Source |
|----------|--------|
| `GCP_REGION` | `terraform output region` |
| `NEXTAUTH_URL` | `terraform output suggested_nextauth_url` (or your custom domain) |

Then push to `main` — the app deploy workflow builds and deploys your Docker image.

## CI workflow

[`.github/workflows/terraform.yml`](../../.github/workflows/terraform.yml) runs `terraform plan` on PRs that touch `infra/` and `terraform apply` on merge to `main`.

Requires the same Workload Identity Federation secrets, plus:

| Secret | Description |
|--------|-------------|
| `TF_STATE_BUCKET` | GCS bucket name for Terraform state |

### Terraform CI state bucket access

If `terraform init` fails with `storage.objects.list` denied, the deploy service account needs object access on the state bucket (one-time, until Terraform can manage IAM itself):

```bash
gcloud storage buckets add-iam-policy-binding "gs://${TF_STATE_BUCKET}" \
  --member="serviceAccount:YOUR_DEPLOY_SA@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

Re-run the **Terraform** workflow after granting access. `infra/terraform/iam.tf` also grants `roles/storage.objectAdmin` at project level on future applies.

## Environments

Use separate tfvars files and state prefixes for staging:

```
environments/staging.tfvars   → backend prefix = "staging"
environments/prod.tfvars      → backend prefix = "prod"
```

## Destroy

```bash
terraform destroy -var-file=environments/prod.tfvars
```

**Warning:** This deletes Cloud SQL, secrets, and Cloud Run. Use with care in production.

## Drift note

Cloud Run container **images** and app-only env vars (API keys, `ADMIN_EMAILS`, etc.) are managed by `deploy.yml`. Terraform ignores image changes via `lifecycle.ignore_changes` so infra and app deploys don't fight each other.

### Importing an existing Scheduler job

If you previously created `sync-matches` manually, import it before apply so Terraform adopts it instead of failing on name collision:

```bash
terraform import \
  -var-file=environments/prod.tfvars \
  google_cloud_scheduler_job.sync_matches \
  "projects/YOUR_PROJECT_ID/locations/europe-west2/jobs/sync-matches"
```

Set `cron_secret` in `prod.tfvars` (or GitHub secret `CRON_SECRET` for CI) to the value already used by the job and Cloud Run.

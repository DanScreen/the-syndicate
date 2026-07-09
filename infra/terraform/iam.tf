# Runtime service account — used by the Cloud Run service at request time
resource "google_service_account" "cloud_run" {
  account_id   = "${replace(local.name_prefix, "-", "")}-run"
  display_name = "The Syndicate Cloud Run runtime (${var.environment})"
}

resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# GitHub Actions deploy service account
resource "google_service_account" "github_deploy" {
  account_id   = "${replace(local.name_prefix, "-", "")}-deploy"
  display_name = "The Syndicate GitHub deploy (${var.environment})"
}

resource "google_project_iam_member" "github_deploy_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/secretmanager.secretAccessor",
    "roles/cloudsql.client",
    "roles/iam.serviceAccountUser",
    # Terraform CI — manage infrastructure via .github/workflows/terraform.yml
    "roles/serviceusage.serviceUsageAdmin",
    "roles/cloudsql.admin",
    "roles/artifactregistry.admin",
    "roles/secretmanager.admin",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/iam.serviceAccountAdmin",
    "roles/resourcemanager.projectIamAdmin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_deploy.email}"
}

# Workload Identity Federation for GitHub Actions
resource "google_iam_workload_identity_pool" "github" {
  depends_on = [google_project_service.required]

  workload_identity_pool_id = "${local.name_prefix}-github"
  display_name              = "GitHub Actions (${var.environment})"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_wif" {
  service_account_id = google_service_account.github_deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

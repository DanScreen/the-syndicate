output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.web.uri
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.web.name
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.docker.repository_id
}

output "artifact_registry_url" {
  description = "Base URL for Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name for Auth Proxy / Cloud Run"
  value       = local.cloud_sql_connection
}

output "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.main.name
}

output "github_deploy_service_account" {
  description = "Service account email for GitHub Actions deploy"
  value       = google_service_account.github_deploy.email
}

output "workload_identity_provider" {
  description = "Workload Identity Provider resource name for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "database_url_secret_id" {
  description = "Secret Manager secret ID for DATABASE_URL"
  value       = google_secret_manager_secret.database_url.secret_id
}

output "auth_secret_id" {
  description = "Secret Manager secret ID for AUTH_SECRET"
  value       = google_secret_manager_secret.auth_secret.secret_id
}

output "github_actions_secrets" {
  description = "Values to configure as GitHub Actions secrets after terraform apply"
  sensitive   = true
  value = {
    GCP_PROJECT_ID                 = var.project_id
    GCP_SERVICE_ACCOUNT            = google_service_account.github_deploy.email
    GCP_WORKLOAD_IDENTITY_PROVIDER = google_iam_workload_identity_pool_provider.github.name
    CLOUD_SQL_CONNECTION_NAME      = local.cloud_sql_connection
    DATABASE_URL                   = google_secret_manager_secret_version.database_url.secret_data
  }
}

output "suggested_nextauth_url" {
  description = "Suggested NEXTAUTH_URL GitHub variable (update after first deploy if using custom domain)"
  value       = local.nextauth_url
}

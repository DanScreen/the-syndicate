resource "google_secret_manager_secret" "database_url" {
  depends_on = [google_project_service.required]

  secret_id = "DATABASE_URL"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id

  secret_data = "postgresql://${google_sql_user.app.name}:${random_password.db_password.result}@localhost/${google_sql_database.app.name}?host=/cloudsql/${local.cloud_sql_connection}"
}

resource "google_secret_manager_secret" "auth_secret" {
  depends_on = [google_project_service.required]

  secret_id = "AUTH_SECRET"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "auth_secret" {
  secret      = google_secret_manager_secret.auth_secret.id
  secret_data = random_password.auth_secret.result
}

resource "random_password" "cron_secret" {
  count = var.cron_secret == "" ? 1 : 0

  length  = 64
  special = false
}

# CRON_SECRET is created/rotated imperatively by the app deploy workflow
# (.github/workflows/deploy.yml "Ensure CRON_SECRET" step) so the value is
# present before Cloud Run mounts it, independent of whether this Terraform
# workflow ran. Terraform therefore *reads* it as a data source rather than
# managing it, to avoid dual ownership (was causing 409 "already exists" on
# apply). The scheduler jobs get the value from local.cron_secret (tfvars),
# not from this secret, so nothing here depends on the secret's contents.
data "google_secret_manager_secret" "cron_secret" {
  secret_id = "CRON_SECRET"
}

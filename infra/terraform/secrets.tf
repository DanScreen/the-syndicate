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

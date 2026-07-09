resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

resource "google_sql_database_instance" "main" {
  depends_on = [google_project_service.required]

  name             = local.cloud_sql_instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier                        = var.cloud_sql_tier
    edition                     = "ENTERPRISE"
    availability_type           = "ZONAL"
    deletion_protection_enabled = var.environment == "prod"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "prod"
      start_time                     = "03:00"
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }
}

resource "google_sql_database" "app" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = var.database_user
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}

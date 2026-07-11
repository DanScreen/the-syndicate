locals {
  name_prefix = "the-syndicate-${var.environment}"

  cloud_sql_instance_name = "${local.name_prefix}-db"
  cloud_sql_connection    = "${var.project_id}:${var.region}:${local.cloud_sql_instance_name}"

  # Placeholder image until GitHub Actions deploys the app image
  placeholder_image = "us-docker.pkg.dev/cloudrun/container/hello"

  nextauth_url = var.nextauth_url != "" ? var.nextauth_url : "https://${var.cloud_run_service_name}-${data.google_project.current.number}.${var.region}.run.app"

  app_base_url = var.app_base_url != "" ? trim(var.app_base_url, "/") : trim(local.nextauth_url, "/")

  cron_secret = var.cron_secret != "" ? var.cron_secret : random_password.cron_secret[0].result
}

data "google_project" "current" {}

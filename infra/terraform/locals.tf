locals {
  name_prefix = "the-syndicate-${var.environment}"

  cloud_sql_instance_name = "${local.name_prefix}-db"
  cloud_sql_connection    = "${var.project_id}:${var.region}:${local.cloud_sql_instance_name}"

  # Placeholder image until GitHub Actions deploys the app image
  placeholder_image = "us-docker.pkg.dev/cloudrun/container/hello"

  nextauth_url = var.nextauth_url != "" ? var.nextauth_url : "https://${var.cloud_run_service_name}-${data.google_project.current.number}.${var.region}.run.app"
}

data "google_project" "current" {}

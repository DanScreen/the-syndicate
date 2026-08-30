resource "google_cloud_run_v2_service" "web" {
  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.auth_secret,
  ]

  name     = var.cloud_run_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
      }
    }

    containers {
      name  = "web"
      image = local.placeholder_image
      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "AUTH_TRUST_HOST"
        value = "true"
      }

      env {
        name  = "NEXTAUTH_URL"
        value = local.nextauth_url
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.auth_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "CRON_SECRET"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.cron_secret.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }

        # Bill CPU only while a request is in flight, and let idle instances be
        # reclaimed so min_instance_count = 0 actually takes effect. This was
        # previously false (set out-of-band via gcloud), which pinned one
        # instance at 86,400 billable seconds/day against ~1-3 requests/min.
        # Safe here: the app does no post-response background work (no after(),
        # no waitUntil, no server-side timers, no ISR regeneration).
        cpu_idle = true

        # Full CPU during container start to offset cold starts now that the
        # service scales to zero.
        startup_cpu_boost = true
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # deploy.yml owns the deployed image AND the full runtime env: it sets ~15
  # variables via `gcloud run deploy --set-env-vars` (ODDS_API_KEY,
  # FOOTBALL_DATA_API_KEY, RESEND_API_KEY, ADMIN_EMAILS, ORIGIN_AUTH_SECRET,
  # the ODDS_* tuning flags...) sourced from GitHub secrets. This resource
  # declares only the handful below, so Terraform MUST ignore env — otherwise
  # any apply that touches the template reconciles the container back to this
  # file and silently deletes every deploy-managed variable.
  #
  # That is exactly what happened on 2026-08-29: a CPU-throttling apply created
  # revision 00187 with 6 env vars instead of 15, and match-result syncing broke
  # (`[odds] ODDS_API_KEY is not configured in production`, 503s on
  # /api/internal/sync-matches) until deploy.yml was re-run.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.web.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

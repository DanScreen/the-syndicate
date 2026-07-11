resource "google_cloud_scheduler_job" "sync_matches" {
  depends_on = [google_project_service.required]

  project     = var.project_id
  region      = var.region
  name        = var.sync_matches_job_name
  description = "Sync football-data.org results into Match; auto-settle ready rounds"
  schedule    = var.sync_matches_schedule
  time_zone   = "UTC"

  http_target {
    http_method = "POST"
    uri         = "${local.app_base_url}/api/internal/sync-matches"

    headers = {
      Authorization = "Bearer ${local.cron_secret}"
    }
  }

  retry_config {
    retry_count = 1
  }
}

resource "google_cloud_scheduler_job" "warm_odds_cache" {
  count = var.enable_warm_odds_cache_job ? 1 : 0

  depends_on = [google_project_service.required]

  project     = var.project_id
  region      = var.region
  name        = var.warm_odds_cache_job_name
  description = "Refresh Odds API snapshots in PostgreSQL (bulk + core extended markets)"
  schedule    = var.warm_odds_cache_schedule
  time_zone   = "UTC"

  http_target {
    http_method = "POST"
    uri         = "${local.app_base_url}/api/internal/warm-odds-cache"

    headers = {
      Authorization = "Bearer ${local.cron_secret}"
    }
  }

  retry_config {
    retry_count = 1
  }
}

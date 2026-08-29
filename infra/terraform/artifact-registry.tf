resource "google_artifact_registry_repository" "docker" {
  depends_on = [google_project_service.required]

  location      = var.region
  repository_id = var.artifact_registry_repo_id
  description   = "Docker images for Tiki Acca (${var.environment})"
  format        = "DOCKER"

  # Every push to main publishes a new image, and nothing removed the old ones —
  # the repo reached ~11.7 GB. KEEP policies win over DELETE, so the most recent
  # 5 versions always survive regardless of age (that guarantees the currently
  # deployed image is never collected, even after a long gap between deploys).
  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

  # Anything not covered above and older than 30 days goes. This still leaves a
  # 30-day rollback window on top of the 5 kept versions.
  cleanup_policies {
    id     = "delete-stale"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30 days
    }
  }

  # Set to true to log what would be deleted without deleting it.
  cleanup_policy_dry_run = false
}

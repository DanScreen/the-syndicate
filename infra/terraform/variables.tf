variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for regional resources"
  type        = string
  default     = "europe-west2"
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
  default     = "prod"
}

variable "github_repository" {
  description = "GitHub repository in owner/repo format for Workload Identity Federation"
  type        = string
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "the-syndicate-web"
}

variable "artifact_registry_repo_id" {
  description = "Artifact Registry repository ID"
  type        = string
  default     = "the-syndicate"
}

variable "database_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "the_syndicate"
}

variable "database_user" {
  description = "PostgreSQL application user"
  type        = string
  default     = "syndicate"
}

variable "cloud_sql_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "nextauth_url" {
  description = "Public URL for Auth.js (set after first deploy if unknown)"
  type        = string
  default     = ""
}

variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run instances (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 3
}

variable "app_base_url" {
  description = "Public app URL for Cloud Scheduler HTTP targets (defaults to nextauth_url)"
  type        = string
  default     = ""
}

variable "cron_secret" {
  description = "Bearer token for POST /api/internal/* cron routes. Leave empty to auto-generate and store in Secret Manager."
  type        = string
  sensitive   = true
  default     = ""
}

variable "sync_matches_schedule" {
  description = "Cron schedule for match results sync (UTC)"
  type        = string
  default     = "*/5 * * * *"
}

variable "warm_odds_cache_schedule" {
  description = "Cron schedule for odds DB warm (UTC)"
  type        = string
  default     = "0 */6 * * *"
}

variable "enable_warm_odds_cache_job" {
  description = "Create Cloud Scheduler job for POST /api/internal/warm-odds-cache"
  type        = bool
  default     = true
}

variable "sync_matches_job_name" {
  description = "Cloud Scheduler job name for match sync"
  type        = string
  default     = "sync-matches"
}

variable "warm_odds_cache_job_name" {
  description = "Cloud Scheduler job name for odds DB warm"
  type        = string
  default     = "warm-odds-cache"
}

variable "round_reminders_schedule" {
  description = "Cron schedule for pick reminder notifications (UTC)"
  type        = string
  default     = "*/15 * * * *"
}

variable "round_reminders_job_name" {
  description = "Cloud Scheduler job name for pick reminders"
  type        = string
  default     = "round-reminders"
}

variable "enable_round_reminders_job" {
  description = "Create Cloud Scheduler job for POST /api/internal/round-reminders"
  type        = bool
  default     = true
}

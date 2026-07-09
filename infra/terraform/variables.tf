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

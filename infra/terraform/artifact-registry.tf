resource "google_artifact_registry_repository" "docker" {
  depends_on = [google_project_service.required]

  location      = var.region
  repository_id = var.artifact_registry_repo_id
  description   = "Docker images for Tiki Acca (${var.environment})"
  format        = "DOCKER"
}

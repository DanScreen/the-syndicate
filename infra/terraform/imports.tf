# One-time state reconciliation.
#
# The sync-matches Cloud Scheduler job already exists in GCP but drifted out of
# Terraform state, so plan wanted to *create* it and apply failed with 409
# "already exists". This block adopts the existing job into state on the next
# apply instead of recreating it. It is a no-op once the resource is in state.
#
# Safe to delete after a successful apply on main (tracked as a follow-up).
import {
  to = google_cloud_scheduler_job.sync_matches
  id = "projects/${var.project_id}/locations/${var.region}/jobs/${var.sync_matches_job_name}"
}

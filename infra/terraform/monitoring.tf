# Alerting. Added after the 2026-08-29 env-wipe incident, where
# /api/internal/sync-matches returned 503 every 5 minutes for ~28 hours and
# nothing noticed — there were no notification channels or alert policies in
# the project at all.
#
# Both policies use log-match conditions rather than metric conditions. Log
# matches return no data points, so they avoid the per-point alerting charge,
# and Cloud Scheduler publishes no metrics to Cloud Monitoring in this project
# (only logs), so a metric condition was not an option for the job alert anyway.

resource "google_monitoring_notification_channel" "email" {
  depends_on = [google_project_service.required]

  display_name = "Tiki Acca alerts (${var.environment})"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

# The gap that let the incident run for 28h. Fires on any scheduler job failing
# for any reason — sync-matches, round-reminders or warm-odds-cache — which is
# broader and more durable than watching a specific endpoint path.
resource "google_monitoring_alert_policy" "scheduler_job_failed" {
  display_name = "Cloud Scheduler job failed"
  combiner     = "OR"
  severity     = "ERROR"

  conditions {
    display_name = "A scheduler job attempt returned an error"

    condition_matched_log {
      filter = "resource.type=\"cloud_scheduler_job\" AND severity>=ERROR"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  # Required for log-match conditions, and it stops a 5-minutely cron from
  # sending 12 emails an hour while an outage is ongoing.
  alert_strategy {
    notification_rate_limit {
      period = "1800s" # at most one email per 30 min
    }
  }

  documentation {
    subject = "Tiki Acca: a scheduled job is failing"
    content = <<-EOT
    A Cloud Scheduler job returned a non-2xx response.

    Check which job and why:
      gcloud logging read 'resource.type="cloud_scheduler_job" AND severity>=ERROR' \
        --project=the-syndicate-prod --limit=10 --freshness=1h

    Most likely causes, in order:
      1. Runtime env vars missing from the Cloud Run service (see
         docs/DEPLOYMENT.md, "Terraform vs deploy.yml"). Fix by running the
         deploy.yml workflow, which re-asserts them from GitHub secrets.
      2. An upstream API (The Odds API, football-data.org) erroring or out of
         quota.
      3. The service failing to start at all — check Cloud Run logs.
    EOT
  }
}

# Catches user-facing regressions the scheduler alert would miss.
resource "google_monitoring_alert_policy" "cloud_run_server_errors" {
  display_name = "Cloud Run 5xx responses"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "the-syndicate-web returned a 5xx"

    condition_matched_log {
      filter = <<-EOT
      resource.type="cloud_run_revision"
      AND resource.labels.service_name="${var.cloud_run_service_name}"
      AND httpRequest.status>=500
      EOT
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    notification_rate_limit {
      period = "1800s"
    }
  }

  documentation {
    subject = "Tiki Acca: the web service is returning 5xx"
    content = "Check Cloud Run logs for the-syndicate-web. If this fires alongside the scheduler alert, treat the scheduler alert as the root cause."
  }
}

"use client";

import { useCallback, useEffect, useState } from "react";

type EstimatedOddsSetting = {
  envEnabled: boolean;
  adminEnabled: boolean;
  effectivelyEnabled: boolean;
};

export function AdminEstimatedOddsToggle() {
  const [setting, setSetting] = useState<EstimatedOddsSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/estimated-odds");
    if (!res.ok) {
      setError("Failed to load estimated-odds setting");
      setLoading(false);
      return;
    }
    setSetting(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(enabled: boolean) {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/estimated-odds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to update estimated-odds setting");
      return;
    }
    setSetting(await res.json());
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading estimated-odds setting...</p>;
  }

  if (!setting) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-danger-strong">
        {error || "Unable to load estimated-odds setting"}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">Estimated odds fill</p>
          <p className="mt-1 text-xs text-muted">
            Median-backfills thin bookmaker tables with a haircut estimate — display only, never
            staked or settled. See docs/specs/estimated-odds-fill.md.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <span className={setting.adminEnabled ? "text-accent" : "text-muted"}>
            {setting.adminEnabled ? "On" : "Off"}
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-accent"
            checked={setting.adminEnabled}
            disabled={saving}
            onChange={(e) => void toggle(e.target.checked)}
          />
        </label>
      </div>

      {!setting.envEnabled && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
          <span className="font-semibold">ESTIMATED_ODDS_ENABLED</span> is off at the deploy
          level, so the fill stays off regardless of this toggle. This admin control only takes
          effect once that env var is set to <code>&quot;true&quot;</code>.
        </p>
      )}

      <p className="text-xs text-muted">
        Effective right now: <span className="font-medium">{setting.effectivelyEnabled ? "On" : "Off"}</span>.
        Odds are cached in DB snapshots, so a flip here applies on the next warm-cache refresh or
        on-demand market fetch — not instantly to already-cached reads.
      </p>

      {error && (
        <div className="rounded-lg border border-danger-strong/40 bg-danger-strong/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

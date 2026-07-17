"use client";

import type { NotificationPreferences } from "@tiki-acca/shared";
import { useEffect, useState } from "react";

type PrefRow = {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
};

const ROWS: { title: string; channel: "email" | "push"; items: PrefRow[] }[] = [
  {
    title: "Email",
    channel: "email",
    items: [
      {
        key: "emailPickReminder",
        label: "Pick reminders",
        description: "Nudge you to submit before the acca locks at kickoff.",
      },
      {
        key: "emailRoundLocked",
        label: "Acca locked",
        description: "When your group acca is locked and ready to place.",
      },
      {
        key: "emailRoundSettled",
        label: "Round settled",
        description: "When a round finishes and points are updated.",
      },
    ],
  },
  {
    title: "Push (mobile app)",
    channel: "push",
    items: [
      {
        key: "pushPickReminder",
        label: "Pick reminders",
        description: "Same as email. Best for last-minute nudges on your phone.",
      },
      {
        key: "pushRoundLocked",
        label: "Acca locked",
        description: "Push when the acca locks.",
      },
      {
        key: "pushRoundSettled",
        label: "Round settled",
        description: "Push when results are in.",
      },
      {
        key: "pushChat",
        label: "Group chat",
        description: "Batched alerts when your group starts chatting.",
      },
    ],
  },
];

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-accent"
      />
    </label>
  );
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/user/notification-preferences")
      .then(async (r) => {
        if (r.ok) setPrefs(await r.json());
      })
      .finally(() => setLoading(false));
  }, []);

  async function update(key: keyof NotificationPreferences, value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        setPrefs(prefs);
        setMessage("Could not save. Try again.");
      }
    } catch {
      setPrefs(prefs);
      setMessage("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading preferences…</p>;
  }

  if (!prefs) {
    return <p className="text-sm text-red-400">Could not load notification settings.</p>;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Choose how Tiki Acca keeps you in the loop. Pick reminders help you
        submit before the acca locks at the first kickoff.
        {saving ? " Saving…" : null}
      </p>
      {message ? <p className="text-sm text-red-400">{message}</p> : null}

      {ROWS.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.items.map((item) => (
              <Toggle
                key={item.key}
                label={item.label}
                description={item.description}
                checked={prefs[item.key]}
                onChange={(v) => update(item.key, v)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import { Avatar } from "@/components/avatar";
import { MAX_AVATAR_UPLOAD_BYTES, type AvatarResponse } from "@tiki-acca/shared";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

/** Shrink anything bigger than this before upload, so uploads stay quick. */
const SHRINK_OVER_BYTES = 2 * 1024 * 1024;
const SHRINK_OVER_PX = 1024;
const SHRUNK_MAX_PX = 1024;

/**
 * Resize a large photo in the browser before upload. The server still crops and
 * re-encodes, so this only keeps the request small. Falls back to the original
 * file if the browser cannot decode it (e.g. HEIC).
 */
async function prepareAvatarFile(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (file.size <= SHRINK_OVER_BYTES && longest <= SHRINK_OVER_PX) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, SHRUNK_MAX_PX / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // JPEG has no alpha, so flatten transparent areas onto white.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) return file;
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

export function ProfilePictureForm({
  name,
  userId,
  initialAvatarUrl,
}: {
  name: string;
  userId: string;
  /** Read on the server, so the photo shows on first paint. */
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    // Clear the input so picking the same file again still fires onChange.
    event.target.value = "";
    if (!picked) return;

    setError(null);
    setBusy("upload");
    try {
      const file = await prepareAvatarFile(picked);
      if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
        setError("That photo is too large. Try a smaller one.");
        return;
      }
      const formData = new FormData();
      formData.append("avatar", file, file.name);
      const res = await fetch("/api/user/avatar", { method: "PUT", body: formData });
      if (!res.ok) {
        setError(await readError(res, "Upload failed. Please try again."));
        return;
      }
      const body = (await res.json()) as AvatarResponse;
      setAvatarUrl(body.avatarUrl);
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onRemove() {
    if (!window.confirm("Remove your profile picture? Your initials will be used instead.")) {
      return;
    }
    setError(null);
    setBusy("remove");
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) {
        setError(await readError(res, "Could not remove your photo. Please try again."));
        return;
      }
      setAvatarUrl(null);
      router.refresh();
    } catch {
      setError("Could not remove your photo. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const inputId = "profile-picture-input";

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Profile picture
      </h2>
      <div className="mt-4 flex items-center gap-5">
        <Avatar name={name} userId={userId} size="xl" imageUrl={avatarUrl} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <label
            htmlFor={inputId}
            aria-disabled={busy !== null}
            className={`inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent ${
              busy !== null ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {busy === "upload" ? "Uploading…" : "Upload photo"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy !== null}
            onChange={onFileChange}
          />
          {avatarUrl ? (
            <button
              type="button"
              onClick={() => void onRemove()}
              disabled={busy !== null}
              className="text-sm font-medium text-muted hover:text-foreground disabled:opacity-60"
            >
              {busy === "remove" ? "Removing…" : "Remove photo"}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Your photo is shown to members of your groups. Without one, your initials are used.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

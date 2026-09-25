"use client";

import { CopyInviteButton } from "@/components/layout/site-footer";
import { useGroupData } from "@tiki-acca/client";
import { copy } from "@tiki-acca/shared";
import { useEffect, useState } from "react";

export default function GroupInvitePage() {
  const { data } = useGroupData();
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    if (data?.group.inviteCode) {
      setInviteUrl(
        `${window.location.origin}/groups/join?code=${encodeURIComponent(data.group.inviteCode)}`
      );
    }
  }, [data?.group.inviteCode]);

  if (!data) return null;

  return (
    <section className="max-w-md">
      <h2 className="text-lg font-semibold">{copy.invite.title}</h2>
      <p className="mt-1 text-sm text-muted">{copy.invite.subtitle}</p>

      <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <p className="text-muted">{copy.invite.codeLabel}</p>
        <p className="font-mono text-lg tracking-widest text-accent">
          {data.group.inviteCode}
        </p>
        {inviteUrl && (
          <>
            <p className="mt-3 text-muted">{copy.invite.linkLabel}</p>
            <p className="break-all font-mono text-xs">{inviteUrl}</p>
            <CopyInviteButton inviteUrl={inviteUrl} />
          </>
        )}
      </div>
    </section>
  );
}

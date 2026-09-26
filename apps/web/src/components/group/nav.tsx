"use client";

import { copy } from "@tiki-acca/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function GroupNav({
  groupId,
  showSettings = false,
  unreadMessageCount = 0,
}: {
  groupId: string;
  showSettings?: boolean;
  unreadMessageCount?: number;
}) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;

  const tabs = [
    {
      href: base,
      label: "Bet",
      active: pathname === base,
    },
    {
      href: `${base}/leaderboard`,
      label: "Leaderboard",
      active: pathname === `${base}/leaderboard`,
    },
    {
      href: `${base}/chat`,
      label: unreadMessageCount > 0 ? `Chat (${unreadMessageCount})` : "Chat",
      active: pathname === `${base}/chat`,
    },
    {
      href: `${base}/invite`,
      label: copy.invite.tab,
      active: pathname === `${base}/invite`,
    },
    ...(showSettings
      ? [
          {
            href: `${base}/settings`,
            label: "Settings",
            active: pathname === `${base}/settings`,
          },
        ]
      : []),
  ];

  return (
    // Phones: tabs share the row so every one fits without scrolling.
    <nav className="mt-6 flex overflow-x-auto border-b border-border sm:gap-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`-mb-px flex-auto whitespace-nowrap border-b-2 px-0.5 py-2 text-center text-[11px] font-medium transition-colors min-[360px]:px-1 min-[360px]:text-xs sm:flex-none sm:px-4 sm:text-sm ${
            tab.active
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

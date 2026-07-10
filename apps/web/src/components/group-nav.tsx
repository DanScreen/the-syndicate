"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function GroupNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;

  const tabs = [
    { href: base, label: "Round", active: pathname === base },
    {
      href: `${base}/leaderboard`,
      label: "Leaderboard",
      active: pathname === `${base}/leaderboard`,
    },
    {
      href: `${base}/performance`,
      label: "Performance",
      active: pathname === `${base}/performance`,
    },
  ];

  return (
    <nav className="mt-6 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
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

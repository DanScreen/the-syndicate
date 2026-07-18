"use client";

import type { RoundMessageDto } from "@tiki-acca/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type GroupActiveRound = {
  id: string;
  betNumber: number | null;
  status: string;
  legsPerMember: number;
  combinedOdds: number | null;
  bestBookmakerId: string | null;
  profitLossGbp: number | null;
  createdAt: string;
  lockedAt: string | null;
  accaBookmakerRankings?: {
    bookmakerId: string;
    bookmakerName: string;
    combinedOdds: number;
    url?: string | null;
    hasAllLegLinks?: boolean;
    linkQuality?: "deeplink" | "hub" | null;
  }[] | null;
  legs: {
    id: string;
    user: { id: string; name: string };
    legIndex?: number;
    fixtureId: string;
    homeTeam: string;
    awayTeam: string;
    competition: string;
    kickoff: string;
    marketType: string;
    selectionLabel: string;
    marketLabel: string;
    odds: number;
    bookmakerName: string;
    outcome: string;
    pointsAwarded: number;
  }[];
  betslipLink: string | null;
  betslipLinks: {
    primaryLink: string | null;
    primaryBookmakerId: string | null;
    primaryLinkQuality?: "deeplink" | "hub" | null;
    primaryHasAllLegLinks?: boolean;
    legLinks: {
      legId: string;
      userName: string;
      selectionLabel: string;
      fixtureLabel: string;
      url: string | null;
      linkQuality?: "deeplink" | "hub" | null;
    }[];
  } | null;
};

export type GroupData = {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    status: string;
    legsPerMember: number;
    maxActiveBets: number;
    memberCount: number;
    unreadMessageCount?: number;
    members: { id: string; name: string; role: string }[];
    owner: { id: string; name: string };
  };
  leaderboard: {
    userId: string;
    name: string;
    points: number;
    legsWon: number;
    legsLost: number;
    role: string;
  }[];
  activeRound: GroupActiveRound | null;
  activeRounds: GroupActiveRound[];
  recentRounds: {
    id: string;
    status: string;
    combinedOdds: number | null;
    lockedAt: string | null;
    settledAt: string | null;
    createdAt: string;
    legs: {
      id: string;
      user: { id: string; name: string };
      homeTeam: string;
      awayTeam: string;
      competition: string;
      kickoff: string;
      selectionLabel: string;
      marketLabel: string;
      marketType: string;
      odds: number;
      bookmakerName: string;
      outcome: string;
      pointsAwarded: number;
    }[];
  }[];
  betslipLink: string | null;
  betslipLinks: {
    primaryLink: string | null;
    primaryBookmakerId: string | null;
    primaryLinkQuality?: "deeplink" | "hub" | null;
    primaryHasAllLegLinks?: boolean;
    legLinks: {
      legId: string;
      userName: string;
      selectionLabel: string;
      fixtureLabel: string;
      url: string | null;
      linkQuality?: "deeplink" | "hub" | null;
    }[];
  } | null;
  legAnnouncements: RoundMessageDto[];
  isOwner: boolean;
};

type GroupDataContextValue = {
  data: GroupData | null;
  loading: boolean;
  reload: () => Promise<void>;
  markChatRead: () => void;
};

const GroupDataContext = createContext<GroupDataContextValue | null>(null);

export function GroupDataProvider({
  groupId,
  children,
}: {
  groupId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.status === 403 || res.status === 404) {
      router.push("/dashboard");
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [groupId, router]);

  const markChatRead = useCallback(() => {
    setData((current) =>
      current
        ? {
            ...current,
            group: { ...current.group, unreadMessageCount: 0 },
          }
        : current
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  // Refresh while any acca is locked so leg results appear as matches finish.
  useEffect(() => {
    if (!data?.activeRounds?.some((round) => round.status === "locked")) return;
    const interval = setInterval(() => {
      void reload();
    }, 60_000);
    return () => clearInterval(interval);
  }, [data?.activeRounds, reload]);

  return (
    <GroupDataContext.Provider value={{ data, loading, reload, markChatRead }}>
      {children}
    </GroupDataContext.Provider>
  );
}

export function useGroupData() {
  const ctx = useContext(GroupDataContext);
  if (!ctx) throw new Error("useGroupData must be used within GroupDataProvider");
  return ctx;
}

"use client";

import type { GroupDetailResponse } from "@tiki-acca/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type GroupDataContextValue = {
  data: GroupDetailResponse | null;
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
  const [data, setData] = useState<GroupDetailResponse | null>(null);
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

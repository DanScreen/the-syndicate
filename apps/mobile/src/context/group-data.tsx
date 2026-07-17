import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { copy } from "@/lib/copy";
import type { GroupDetailResponse } from "@tiki-acca/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type GroupDataContextValue = {
  data: GroupDetailResponse | null;
  loading: boolean;
  error: string;
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
  const { token } = useAuth();
  const [data, setData] = useState<GroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!token || !groupId) return;
    const json = await api<GroupDetailResponse>(`/api/groups/${groupId}`, { token });
    setData(json);
    setError("");
  }, [token, groupId]);

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
    reload()
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : copy.group.loadFailed)
      )
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (data?.activeRound?.status !== "locked") return;
    const interval = setInterval(() => {
      void reload();
    }, 60_000);
    return () => clearInterval(interval);
  }, [data?.activeRound?.status, data?.activeRound?.id, reload]);

  const value = useMemo(
    () => ({ data, loading, error, reload, markChatRead }),
    [data, loading, error, reload, markChatRead]
  );

  return (
    <GroupDataContext.Provider value={value}>{children}</GroupDataContext.Provider>
  );
}

export function useGroupData() {
  const ctx = useContext(GroupDataContext);
  if (!ctx) throw new Error("useGroupData must be used within GroupDataProvider");
  return ctx;
}

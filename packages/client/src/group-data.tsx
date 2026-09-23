import { copy, type GroupDetailResponse } from "@tiki-acca/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, type ApiFetcher } from "./api";

/** Refresh cadence while any bet is locked, so results appear as matches finish. */
export const LOCKED_ROUND_POLL_MS = 60_000;

type GroupDataContextValue = {
  data: GroupDetailResponse | null;
  loading: boolean;
  /** Last load error; data keeps its previous value. */
  error: string;
  /** Re-fetch the group. Never throws. */
  reload: () => Promise<void>;
  /** Clear the unread chat badge locally once the thread has been read. */
  markChatRead: () => void;
};

const GroupDataContext = createContext<GroupDataContextValue | null>(null);

/** Loads `GET /api/groups/[id]` for every group tab and keeps it fresh. */
export function GroupDataProvider({
  groupId,
  fetcher,
  onUnavailable,
  children,
}: {
  groupId: string;
  fetcher: ApiFetcher;
  /** Not a member (403) or no such group (404). Without it an error is shown. */
  onUnavailable?: () => void;
  children: ReactNode;
}) {
  const [data, setData] = useState<GroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const json = await fetcher<GroupDetailResponse>(
        `/api/groups/${encodeURIComponent(groupId)}`
      );
      setData(json);
      setError("");
    } catch (caught) {
      if (
        onUnavailable &&
        caught instanceof ApiError &&
        (caught.status === 403 || caught.status === 404)
      ) {
        onUnavailable();
        return;
      }
      setError(caught instanceof ApiError ? caught.message : copy.group.loadFailed);
    }
  }, [fetcher, groupId, onUnavailable]);

  const markChatRead = useCallback(() => {
    setData((current) =>
      current ? { ...current, group: { ...current.group, unreadMessageCount: 0 } } : current
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const hasLockedRound = Boolean(
    data?.activeRounds?.some((round) => round.status === "locked")
  );
  useEffect(() => {
    if (!hasLockedRound) return;
    const interval = setInterval(() => void reload(), LOCKED_ROUND_POLL_MS);
    return () => clearInterval(interval);
  }, [hasLockedRound, reload]);

  const value = useMemo(
    () => ({ data, loading, error, reload, markChatRead }),
    [data, loading, error, reload, markChatRead]
  );

  return <GroupDataContext.Provider value={value}>{children}</GroupDataContext.Provider>;
}

export function useGroupData(): GroupDataContextValue {
  const ctx = useContext(GroupDataContext);
  if (!ctx) throw new Error("useGroupData must be used within GroupDataProvider");
  return ctx;
}

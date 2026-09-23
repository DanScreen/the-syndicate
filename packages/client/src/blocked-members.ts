import { copy, type BlockedMember, type BlockedMembersResponse } from "@tiki-acca/shared";
import { useCallback, useEffect, useState } from "react";
import type { ApiFetcher } from "./api";

/** Members you've blocked in chat, with unblock — the Account page list on web and mobile. */
export function useBlockedMembers(fetcher: ApiFetcher) {
  const [blocked, setBlocked] = useState<BlockedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetcher<BlockedMembersResponse>("/api/user/blocks")
      .then((data) => {
        if (!cancelled) setBlocked(data.blocks);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const unblock = useCallback(
    async (userId: string) => {
      setError("");
      try {
        await fetcher(`/api/users/${encodeURIComponent(userId)}/block`, { method: "DELETE" });
        setBlocked((current) => current.filter((b) => b.userId !== userId));
      } catch {
        setError(copy.blockedMembers.unblockFailed);
      }
    },
    [fetcher]
  );

  return { blocked, loading, error, unblock };
}

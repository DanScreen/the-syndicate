import {
  HISTORY_PAGE_SIZE,
  copy,
  type GroupHistoryResponse,
  type HistoryRound,
} from "@tiki-acca/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiFetcher } from "./api";

/** The first page from group data, then any older pages, without repeats. */
export function mergeHistoryPages(first: HistoryRound[], older: HistoryRound[]): HistoryRound[] {
  const seen = new Set(first.map((round) => round.id));
  return [...first, ...older.filter((round) => !seen.has(round.id))];
}

/**
 * Settled bets for the Bet tab: the latest page comes from group data
 * (`recentRounds`, kept fresh by its polling), and `loadMore` fetches
 * HISTORY_PAGE_SIZE older bets at a time. When a new bet settles the list
 * collapses back to the first page.
 */
export function useGroupHistory({
  groupId,
  fetcher,
  recentRounds,
  settledRoundCount,
}: {
  groupId: string;
  fetcher: ApiFetcher;
  recentRounds: HistoryRound[];
  settledRoundCount: number;
}) {
  const [older, setOlder] = useState<HistoryRound[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  // Bumped on reset so a page requested before it is dropped.
  const generationRef = useRef(0);

  const newestId = recentRounds[0]?.id ?? null;
  useEffect(() => {
    generationRef.current += 1;
    setOlder([]);
    setExhausted(false);
    setLoadingMore(false);
    setError("");
  }, [groupId, newestId]);

  const rounds = mergeHistoryPages(recentRounds, older);
  const hasMore = !exhausted && rounds.length < settledRoundCount;
  const lastId = rounds.at(-1)?.id;

  const loadMore = useCallback(async () => {
    if (loadingMore || !lastId) return;
    const generation = generationRef.current;
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: String(HISTORY_PAGE_SIZE),
        before: lastId,
      });
      const page = await fetcher<GroupHistoryResponse>(
        `/api/groups/${encodeURIComponent(groupId)}/history?${params}`
      );
      if (generation !== generationRef.current) return;
      setOlder((current) => [...current, ...page.rounds]);
      if (page.rounds.length < HISTORY_PAGE_SIZE) setExhausted(true);
    } catch {
      if (generation === generationRef.current) setError(copy.history.loadFailed);
    } finally {
      if (generation === generationRef.current) setLoadingMore(false);
    }
  }, [fetcher, groupId, lastId, loadingMore]);

  return { rounds, hasMore, loadingMore, error, loadMore };
}

import {
  DELETED_MESSAGE_BODY,
  copy,
  type ReactionEmoji,
  type RoundMessageDto,
  type RoundMessagesResponse,
} from "@tiki-acca/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type ApiFetcher } from "./api";

/** How often an open chat checks for new messages and reactions. */
export const CHAT_POLL_MS = 20_000;

/** Merge by id, oldest first (ties broken by id so order is stable). */
export function mergeMessages(
  existing: RoundMessageDto[],
  incoming: RoundMessageDto[]
): RoundMessageDto[] {
  if (incoming.length === 0) return existing;
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
}

function replaceMessage(list: RoundMessageDto[], updated: RoundMessageDto) {
  return list.map((m) => (m.id === updated.id ? updated : m));
}

/**
 * Group chat state and actions: load, poll, post, delete, react, report,
 * block, and paging back through history. Rendering, scrolling and
 * confirmation dialogs stay in each app.
 */
export function useGroupThread({
  groupId,
  fetcher,
  readOnly = false,
  refreshKey = 0,
  isVisible = () => true,
  onRead,
  onMessagesChange,
  onPrepend,
}: {
  groupId: string;
  fetcher: ApiFetcher;
  /** Pick-row reaction strips reuse the thread without polling or posting. */
  readOnly?: boolean;
  /** Bump to force a reload (e.g. after a push notification). */
  refreshKey?: number;
  /** Poll only while the page / app is in the foreground. */
  isVisible?: () => boolean;
  /** Called after each successful load (the server marks the thread read). */
  onRead?: () => void;
  /** Every message plus the pick announcements, whenever either changes. */
  onMessagesChange?: (messages: RoundMessageDto[]) => void;
  /** Called just before older messages are merged in, so the UI can hold its scroll. */
  onPrepend?: () => void;
}) {
  const [messages, setMessages] = useState<RoundMessageDto[]>([]);
  const [legAnnouncements, setLegAnnouncements] = useState<RoundMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState("");
  const loadedEarlierRef = useRef(false);
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  useEffect(() => {
    onMessagesChange?.(mergeMessages(messages, legAnnouncements));
  }, [messages, legAnnouncements, onMessagesChange]);

  const messagesPath = `/api/groups/${encodeURIComponent(groupId)}/messages`;

  // Reload the latest page each time so reaction toggles (which add no new
  // message) reconcile on every poll.
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const json = await fetcher<RoundMessagesResponse>(messagesPath, { signal });
      setMessages((prev) => mergeMessages(prev, json.messages));
      if (json.legAnnouncements) setLegAnnouncements(json.legAnnouncements);
      if (!loadedEarlierRef.current) setHasMore(Boolean(json.hasMore));
      onRead?.();
    },
    [fetcher, messagesPath, onRead]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadedEarlierRef.current = false;
    setMessages([]);
    setLegAnnouncements([]);
    setError("");
    setLoading(true);
    load(controller.signal)
      .catch(() => {
        if (!controller.signal.aborted) setError("Couldn't load the chat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (refreshKey > 0 && isVisibleRef.current()) void load().catch(() => {});
  }, [load, refreshKey]);

  useEffect(() => {
    if (readOnly) return;
    const interval = setInterval(() => {
      if (isVisibleRef.current()) void load().catch(() => {});
    }, CHAT_POLL_MS);
    return () => clearInterval(interval);
  }, [load, readOnly]);

  const applyUpdate = useCallback((updated: RoundMessageDto) => {
    setMessages((prev) => replaceMessage(prev, updated));
    setLegAnnouncements((prev) => replaceMessage(prev, updated));
  }, []);

  /** Post the current input. Resolves true once sent. */
  async function send(): Promise<boolean> {
    const body = input.trim();
    if (!body || posting) return false;
    setPosting(true);
    setError("");
    try {
      const json = await fetcher<{ message: RoundMessageDto }>(messagesPath, {
        method: "POST",
        body: { body },
      });
      setMessages((prev) => mergeMessages(prev, [json.message]));
      setInput("");
      return true;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.status === 429
            ? "You're posting too fast. Slow down a moment."
            : caught.message
          : "Couldn't send that message."
      );
      return false;
    } finally {
      setPosting(false);
    }
  }

  async function remove(messageId: string) {
    try {
      const json = await fetcher<{ message: RoundMessageDto }>(
        `/api/messages/${encodeURIComponent(messageId)}`,
        { method: "DELETE" }
      );
      applyUpdate(json.message);
    } catch {
      setError("Couldn't delete that message.");
    }
  }

  async function react(messageId: string, emoji: ReactionEmoji) {
    try {
      const json = await fetcher<{ message: RoundMessageDto }>(
        `/api/messages/${encodeURIComponent(messageId)}/reactions`,
        { method: "POST", body: { emoji } }
      );
      applyUpdate(json.message);
    } catch {
      setError("Couldn't update that reaction.");
    }
  }

  /** Flag a message for review. Resolves true once reported. */
  async function report(messageId: string): Promise<boolean> {
    try {
      await fetcher<{ ok: boolean }>(`/api/messages/${encodeURIComponent(messageId)}/report`, {
        method: "POST",
        body: {},
      });
      return true;
    } catch {
      setError(copy.chat.reportFailed);
      return false;
    }
  }

  /** Block a member everywhere and hide their messages here. Resolves true once blocked. */
  async function block(userId: string): Promise<boolean> {
    try {
      await fetcher<{ ok: boolean }>(`/api/users/${encodeURIComponent(userId)}/block`, {
        method: "POST",
      });
      setMessages((prev) => prev.filter((m) => !(m.kind === "user" && m.user?.id === userId)));
      return true;
    } catch {
      setError(copy.chat.blockFailed);
      return false;
    }
  }

  async function loadEarlier() {
    const oldestId = messages[0]?.id;
    if (!oldestId || loadingEarlier) return;
    setLoadingEarlier(true);
    loadedEarlierRef.current = true;
    try {
      const json = await fetcher<RoundMessagesResponse>(
        `${messagesPath}?before=${encodeURIComponent(oldestId)}`
      );
      onPrepend?.();
      setMessages((prev) => mergeMessages(prev, json.messages));
      setHasMore(Boolean(json.hasMore));
    } catch {
      setError("Couldn't load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }

  return {
    messages,
    legAnnouncements,
    loading,
    error,
    setError,
    input,
    setInput,
    posting,
    hasMore,
    loadingEarlier,
    send,
    remove,
    react,
    report,
    block,
    loadEarlier,
    reload: load,
  };
}

/** Whether the viewer may report / block a message's author. */
export function canModerateMessage(
  message: RoundMessageDto,
  currentUserId: string | undefined
): boolean {
  const authorId = message.user?.id;
  return (
    message.kind === "user" &&
    Boolean(authorId) &&
    authorId !== currentUserId &&
    message.body !== DELETED_MESSAGE_BODY
  );
}

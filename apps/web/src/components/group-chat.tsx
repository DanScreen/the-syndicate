"use client";

import {
  DELETED_MESSAGE_BODY,
  MAX_MESSAGE_LENGTH,
  REACTION_EMOJIS,
  REACTION_PICKER_EMOJIS,
  type ReactionEmoji,
  type RoundMessageDto,
  type RoundMessagesResponse,
} from "@tiki-acca/shared";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

const POLL_MS = 20_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mergeMessages(
  existing: RoundMessageDto[],
  incoming: RoundMessageDto[]
): RoundMessageDto[] {
  if (incoming.length === 0) return existing;
  const byId = new Map(existing.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => {
    const t = a.createdAt.localeCompare(b.createdAt);
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
}

export function RoundThread({
  roundId,
  currentUserId,
  isOwner = false,
  readOnly = false,
  onMessagesChange,
  onRead,
  refreshKey = 0,
}: {
  roundId: string;
  currentUserId?: string;
  isOwner?: boolean;
  readOnly?: boolean;
  onMessagesChange?: (messages: RoundMessageDto[]) => void;
  onRead?: () => void;
  refreshKey?: number;
}) {
  const [messages, setMessages] = useState<RoundMessageDto[]>([]);
  const [legAnnouncements, setLegAnnouncements] = useState<RoundMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);
  const loadedEarlierRef = useRef(false);

  useEffect(() => {
    setMessages([]);
    setLegAnnouncements([]);
    lastIdRef.current = null;
    loadedEarlierRef.current = false;
    setError(null);
  }, [roundId]);

  useEffect(() => {
    onMessagesChange?.(mergeMessages(messages, legAnnouncements));
  }, [messages, legAnnouncements, onMessagesChange]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      // Reload the latest page so reaction toggles (which do not create a new
      // message cursor) reconcile on every poll.
      const res = await fetch(`/api/rounds/${roundId}/messages`, { signal });
      if (!res.ok) throw new Error("Failed to load messages");
      const json = (await res.json()) as RoundMessagesResponse;
      if (json.messages.length > 0) {
        lastIdRef.current = json.messages[json.messages.length - 1]!.id;
      }
      setMessages((prev) => mergeMessages(prev, json.messages));
      if (json.legAnnouncements) setLegAnnouncements(json.legAnnouncements);
      if (!loadedEarlierRef.current) setHasMore(Boolean(json.hasMore));
      onRead?.();
    },
    [roundId, onRead]
  );

  // Initial load.
  useEffect(() => {
    const controller = new AbortController();
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
    if (refreshKey > 0) void load().catch(() => {});
  }, [load, refreshKey]);

  // Poll for new messages while the tab is visible (interactive threads only).
  useEffect(() => {
    if (readOnly) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [load, readOnly]);

  // Keep pinned to the bottom when new messages arrive and we were already there.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    atBottomRef.current = true;
    try {
      const res = await fetch(`/api/rounds/${roundId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.status === 429) {
        setError("You're posting too fast. Slow down a moment.");
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          typeof json?.error === "string"
            ? json.error
            : "Couldn't send that message."
        );
        return;
      }
      const json = (await res.json()) as { message: RoundMessageDto };
      lastIdRef.current = json.message.id;
      setMessages((prev) => mergeMessages(prev, [json.message]));
      setInput("");
    } catch {
      setError("Couldn't send that message.");
    } finally {
      setPosting(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(e);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const json = (await res.json()) as { message: RoundMessageDto };
      setMessages((prev) => prev.map((m) => (m.id === id ? json.message : m)));
    } catch {
      setError("Couldn't delete that message.");
    }
  }

  async function toggleReaction(messageId: string, emoji: ReactionEmoji) {
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("Failed to react");
      const json = (await res.json()) as { message: RoundMessageDto };
      setMessages((prev) =>
        prev.map((message) => (message.id === messageId ? json.message : message))
      );
      setLegAnnouncements((prev) =>
        prev.map((message) => (message.id === messageId ? json.message : message))
      );
    } catch {
      setError("Couldn't update that reaction.");
    }
  }

  async function loadEarlier() {
    const oldestId = messages[0]?.id;
    if (!oldestId || loadingEarlier) return;
    setLoadingEarlier(true);
    loadedEarlierRef.current = true;
    atBottomRef.current = false;
    try {
      const res = await fetch(
        `/api/rounds/${roundId}/messages?before=${encodeURIComponent(oldestId)}`
      );
      if (!res.ok) throw new Error("Failed to load earlier messages");
      const json = (await res.json()) as RoundMessagesResponse;
      setMessages((current) => mergeMessages(current, json.messages));
      setHasMore(Boolean(json.hasMore));
    } catch {
      setError("Couldn't load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }

  const remaining = MAX_MESSAGE_LENGTH - input.length;

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">Group Chat</h2>
        <p className="text-xs text-muted">
          React to picks, roast the acca, keep the banter going.
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="max-h-96 min-h-[8rem] space-y-2 overflow-y-auto px-4 py-3"
      >
        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadEarlier()}
            disabled={loadingEarlier}
            className="mx-auto block text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            {loadingEarlier ? "Loading…" : "Load earlier messages"}
          </button>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted">Loading chat…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No messages yet. Start the chat.
          </p>
        ) : (
          messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              canDelete={
                !readOnly &&
                m.kind === "user" &&
                m.body !== DELETED_MESSAGE_BODY &&
                (isOwner || m.user?.id === currentUserId)
              }
              onDelete={remove}
              onReact={toggleReaction}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {!readOnly && (
        <form onSubmit={submit} className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Say something…"
              className="min-h-[2.5rem] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={posting || input.trim().length === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between">
            {error ? (
              <span className="text-xs text-red-400">{error}</span>
            ) : (
              <span />
            )}
            {remaining <= 50 && (
              <span className="text-xs text-muted">{remaining}</span>
            )}
          </div>
        </form>
      )}
      {readOnly && error && (
        <p className="border-t border-border px-4 py-2 text-xs text-red-400">{error}</p>
      )}
    </section>
  );
}

function ChatMessage({
  message,
  canDelete,
  onDelete,
  onReact,
  readOnly,
}: {
  message: RoundMessageDto;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: ReactionEmoji) => void;
  readOnly: boolean;
}) {
  const deleted = message.body === DELETED_MESSAGE_BODY;

  if (message.kind === "system") {
    return (
      <div className="px-2 py-1 text-center text-xs text-muted">
        <p>
          <span className="italic">{message.body}</span>
          <span className="ml-2 tabular-nums opacity-60">{formatTime(message.createdAt)}</span>
        </p>
        <ReactionBar message={message} onReact={onReact} readOnly={readOnly} />
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-lg px-2 py-1 hover:bg-background/50">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-foreground">
          {message.user?.name ?? "Someone"}
        </span>
        <span className="text-xs tabular-nums text-muted">
          {formatTime(message.createdAt)}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            className="ml-auto text-xs text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
            aria-label="Delete message"
          >
            Delete
          </button>
        )}
      </div>
      <p
        className={
          deleted
            ? "text-sm italic text-muted"
            : "whitespace-pre-wrap break-words text-sm text-foreground"
        }
      >
        {message.body}
      </p>
      <ReactionBar message={message} onReact={onReact} readOnly={readOnly} />
    </div>
  );
}

export function ReactionBar({
  message,
  onReact,
  readOnly = false,
}: {
  message: RoundMessageDto;
  onReact: (id: string, emoji: ReactionEmoji) => void;
  readOnly?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const byEmoji = new Map(message.reactions.map((reaction) => [reaction.emoji, reaction]));

  useEffect(() => {
    if (!pickerOpen) return;
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [pickerOpen]);

  if (readOnly && message.reactions.length === 0) return null;

  const usedEmojis = message.reactions.map((reaction) => reaction.emoji);
  const quickSet = new Set<string>(REACTION_EMOJIS);
  const moreEmojis = REACTION_PICKER_EMOJIS.filter((emoji) => !quickSet.has(emoji));
  const hasReactions = usedEmojis.length > 0;

  return (
    <div className="relative mt-1 flex flex-wrap items-center justify-center gap-1">
      {usedEmojis.map((emoji) => {
        const reaction = byEmoji.get(emoji)!;
        return (
          <button
            key={emoji}
            type="button"
            disabled={readOnly}
            onClick={() => onReact(message.id, emoji)}
            title={reaction.userNames.join(", ")}
            className={`rounded-full border px-1.5 py-0.5 text-xs ${
              reaction.reacted
                ? "border-accent bg-accent-muted text-foreground"
                : "border-border text-muted hover:border-accent/60"
            } disabled:cursor-default`}
          >
            {emoji} {reaction.count}
          </button>
        );
      })}
      {!readOnly ? (
        <>
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label="Add reaction"
            title="Add reaction"
            className="rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:border-accent/60 hover:text-foreground"
          >
            {hasReactions ? "+" : "React"}
          </button>
          {pickerOpen
            ? createPortal(
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                  role="presentation"
                  onMouseDown={() => setPickerOpen(false)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Choose an emoji"
                    className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-2xl"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        Add a reaction
                      </p>
                      <button
                        type="button"
                        onClick={() => setPickerOpen(false)}
                        aria-label="Close emoji picker"
                        className="text-sm text-muted hover:text-foreground"
                      >
                        Close
                      </button>
                    </div>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">
                      Quick reactions
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onReact(message.id, emoji);
                            setPickerOpen(false);
                          }}
                          title={`React ${emoji}`}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xl hover:border-accent/60 hover:bg-background"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
                      More
                    </p>
                    <div className="mt-2 grid max-h-[min(50vh,18rem)] grid-cols-8 gap-1 overflow-y-auto sm:grid-cols-10">
                      {moreEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onReact(message.id, emoji);
                            setPickerOpen(false);
                          }}
                          title={`React ${emoji}`}
                          className="rounded-lg p-1.5 text-xl hover:bg-background"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}
        </>
      ) : null}
    </div>
  );
}

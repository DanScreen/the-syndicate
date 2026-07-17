import { api, ApiError } from "@/api/client";
import { colors } from "@/config";
import {
  DELETED_MESSAGE_BODY,
  MAX_MESSAGE_LENGTH,
  REACTION_EMOJIS,
  REACTION_PICKER_EMOJIS,
  type ReactionEmoji,
  type RoundMessageDto,
  type RoundMessagesResponse,
} from "@tiki-acca/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const POLL_MS = 20_000;

function mergeMessages(
  existing: RoundMessageDto[],
  incoming: RoundMessageDto[]
): RoundMessageDto[] {
  const byId = new Map(existing.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RoundThread({
  roundId,
  token,
  currentUserId,
  isOwner = false,
  readOnly = false,
  onMessagesChange,
  onRead,
  refreshKey = 0,
}: {
  roundId: string;
  token: string;
  currentUserId?: string;
  isOwner?: boolean;
  readOnly?: boolean;
  onMessagesChange?: (messages: RoundMessageDto[]) => void;
  onRead?: () => void;
  refreshKey?: number;
}) {
  const [messages, setMessages] = useState<RoundMessageDto[]>([]);
  const [legAnnouncements, setLegAnnouncements] = useState<RoundMessageDto[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState("");
  const lastId = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const loadedEarlier = useRef(false);
  const skipNextAutoScroll = useRef(false);

  useEffect(() => {
    onMessagesChange?.(mergeMessages(messages, legAnnouncements));
  }, [messages, legAnnouncements, onMessagesChange]);

  const load = useCallback(async () => {
    const response = await api<RoundMessagesResponse>(
      `/api/rounds/${roundId}/messages`,
      { token }
    );
    if (response.messages.length > 0) {
      lastId.current = response.messages[response.messages.length - 1]!.id;
      setMessages((current) => mergeMessages(current, response.messages));
    }
    if (response.legAnnouncements) {
      setLegAnnouncements(response.legAnnouncements);
    }
    if (!loadedEarlier.current) setHasMore(Boolean(response.hasMore));
    onRead?.();
  }, [roundId, token, onRead]);

  useEffect(() => {
    let cancelled = false;
    lastId.current = null;
    loadedEarlier.current = false;
    setMessages([]);
    setLegAnnouncements([]);
    setLoading(true);
    load()
      .catch(() => {
        if (!cancelled) setError("Couldn't load the chat.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    if (readOnly) return () => {
      cancelled = true;
    };
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void load().catch(() => {});
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load, readOnly]);

  useEffect(() => {
    if (refreshKey > 0 && AppState.currentState === "active") {
      void load().catch(() => {});
    }
  }, [load, refreshKey]);

  async function send() {
    const body = input.trim();
    if (!body || posting) return;
    setPosting(true);
    setError("");
    try {
      const response = await api<{ message: RoundMessageDto }>(
        `/api/rounds/${roundId}/messages`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ body }),
        }
      );
      lastId.current = response.message.id;
      setMessages((current) => mergeMessages(current, [response.message]));
      setInput("");
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 429
          ? "You're posting too fast. Slow down a moment."
          : "Couldn't send that message."
      );
    } finally {
      setPosting(false);
    }
  }

  async function remove(messageId: string) {
    try {
      const response = await api<{ message: RoundMessageDto }>(
        `/api/messages/${messageId}`,
        { method: "DELETE", token }
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? response.message : message
        )
      );
      setLegAnnouncements((current) =>
        current.map((message) =>
          message.id === messageId ? response.message : message
        )
      );
    } catch {
      setError("Couldn't delete that message.");
    }
  }

  async function react(messageId: string, emoji: ReactionEmoji) {
    try {
      const response = await api<{ message: RoundMessageDto }>(
        `/api/messages/${messageId}/reactions`,
        { method: "POST", token, body: JSON.stringify({ emoji }) }
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? response.message : message
        )
      );
      setLegAnnouncements((current) =>
        current.map((message) =>
          message.id === messageId ? response.message : message
        )
      );
    } catch {
      setError("Couldn't update that reaction.");
    }
  }

  async function loadEarlier() {
    const oldestId = messages[0]?.id;
    if (!oldestId || loadingEarlier) return;
    setLoadingEarlier(true);
    loadedEarlier.current = true;
    try {
      const response = await api<RoundMessagesResponse>(
        `/api/rounds/${roundId}/messages?before=${encodeURIComponent(oldestId)}`,
        { token }
      );
      skipNextAutoScroll.current = true;
      setMessages((current) => mergeMessages(current, response.messages));
      setHasMore(Boolean(response.hasMore));
    } catch {
      setError("Couldn't load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Banter</Text>
        <Text style={styles.hint}>Chat and round updates</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        style={styles.messages}
        onContentSizeChange={() => {
          if (skipNextAutoScroll.current) {
            skipNextAutoScroll.current = false;
            return;
          }
          scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {hasMore ? (
          <Pressable
            disabled={loadingEarlier}
            onPress={() => void loadEarlier()}
          >
            <Text style={styles.loadEarlier}>
              {loadingEarlier ? "Loading…" : "Load earlier messages"}
            </Text>
          </Pressable>
        ) : null}
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : messages.length === 0 ? (
          <Text style={styles.empty}>No messages yet. Start the banter.</Text>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              readOnly={readOnly}
              canDelete={
                !readOnly &&
                message.kind === "user" &&
                message.body !== DELETED_MESSAGE_BODY &&
                (isOwner || message.user?.id === currentUserId)
              }
              onDelete={remove}
              onReact={react}
            />
          ))
        )}
      </ScrollView>
      {!readOnly ? (
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={(value) => setInput(value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="Say something…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            style={styles.input}
          />
          <Pressable
            onPress={() => void send()}
            disabled={posting || !input.trim()}
            style={({ pressed }) => [
              styles.send,
              (posting || !input.trim()) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Message({
  message,
  readOnly,
  canDelete,
  onDelete,
  onReact,
}: {
  message: RoundMessageDto;
  readOnly: boolean;
  canDelete: boolean;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: ReactionEmoji) => void;
}) {
  if (message.kind === "system") {
    return (
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>
          {message.body} · {formatTime(message.createdAt)}
        </Text>
        <ReactionBar message={message} readOnly={readOnly} onReact={onReact} />
      </View>
    );
  }
  return (
    <View style={styles.message}>
      <View style={styles.messageHeader}>
        <Text style={styles.author}>{message.user?.name ?? "Someone"}</Text>
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
        {canDelete ? (
          <Pressable onPress={() => onDelete(message.id)}>
            <Text style={styles.delete}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
      <Text
        style={
          message.body === DELETED_MESSAGE_BODY
            ? styles.deleted
            : styles.body
        }
      >
        {message.body}
      </Text>
      <ReactionBar message={message} readOnly={readOnly} onReact={onReact} />
    </View>
  );
}

export function ReactionBar({
  message,
  readOnly = false,
  onReact,
}: {
  message: RoundMessageDto;
  readOnly?: boolean;
  onReact: (messageId: string, emoji: ReactionEmoji) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const byEmoji = new Map(message.reactions.map((reaction) => [reaction.emoji, reaction]));
  if (readOnly && message.reactions.length === 0) return null;
  const baseEmoji = new Set<string>(REACTION_EMOJIS);
  const options = readOnly
    ? message.reactions.map((reaction) => reaction.emoji)
    : [
        ...REACTION_EMOJIS,
        ...message.reactions
          .map((reaction) => reaction.emoji)
          .filter((emoji) => !baseEmoji.has(emoji)),
      ];

  return (
    <View>
      <View style={styles.reactions}>
      {options.map((emoji) => {
        const reaction = byEmoji.get(emoji);
        return (
          <Pressable
            key={emoji}
            disabled={readOnly}
            onPress={() => onReact(message.id, emoji)}
            onLongPress={() => {
              if (reaction) {
                Alert.alert(`${emoji} reactions`, reaction.userNames.join(", "));
              }
            }}
            style={[styles.reaction, reaction?.reacted && styles.reacted]}
          >
            <Text style={styles.reactionText}>
              {emoji}
              {reaction ? ` ${reaction.count}` : ""}
            </Text>
          </Pressable>
        );
      })}
      {!readOnly ? (
        <Pressable
          onPress={() => setPickerOpen((open) => !open)}
          accessibilityLabel="Add reaction"
          style={styles.reaction}
        >
          <Text style={styles.reactionText}>+</Text>
        </Pressable>
      ) : null}
      </View>
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.emojiModalBackdrop}>
          <View style={styles.emojiPicker}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerLabel}>Choose an emoji</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Text style={styles.emojiPickerClose}>Close</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {REACTION_PICKER_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    onReact(message.id, emoji);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.emojiOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  header: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 18, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  messages: { maxHeight: 380, minHeight: 120, padding: 12 },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: 24 },
  loadEarlier: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingBottom: 8,
  },
  message: { paddingVertical: 6 },
  systemMessage: { alignItems: "center", paddingVertical: 6 },
  systemText: { color: colors.muted, fontSize: 12, fontStyle: "italic", textAlign: "center" },
  messageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  author: { color: colors.text, fontSize: 14, fontWeight: "600" },
  time: { color: colors.muted, fontSize: 11 },
  delete: { color: colors.danger, fontSize: 11, marginLeft: "auto" },
  body: { color: colors.text, fontSize: 14, marginTop: 2 },
  deleted: { color: colors.muted, fontSize: 14, fontStyle: "italic", marginTop: 2 },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 },
  reaction: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reacted: { borderColor: colors.accent, backgroundColor: "rgba(34,197,94,0.12)" },
  reactionText: { color: colors.text, fontSize: 11 },
  emojiModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 24,
  },
  emojiPicker: {
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 14,
  },
  emojiPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  emojiPickerLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  emojiPickerClose: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 4,
  },
  emojiOption: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  emojiOptionText: { fontSize: 22 },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  send: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 },
  sendText: { color: "#000", fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: 12, paddingBottom: 10 },
});

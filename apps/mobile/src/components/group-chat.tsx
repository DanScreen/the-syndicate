import { useApiFetcher } from "@/api/use-api-fetcher";
import { colors } from "@/config";
import {
  DELETED_MESSAGE_BODY,
  MAX_MESSAGE_LENGTH,
  REACTION_EMOJIS,
  REACTION_PICKER_EMOJIS,
  copy,
  type ReactionEmoji,
  type RoundMessageDto,
} from "@tiki-acca/shared";
import { canModerateMessage, useGroupThread } from "@tiki-acca/client";
import { useCallback, useRef, useState } from "react";
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

function isAppActive() {
  return AppState.currentState === "active";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GroupThread({
  groupId,
  currentUserId,
  isOwner = false,
  readOnly = false,
  onMessagesChange,
  onRead,
  refreshKey = 0,
}: {
  groupId: string;
  currentUserId?: string;
  isOwner?: boolean;
  readOnly?: boolean;
  onMessagesChange?: (messages: RoundMessageDto[]) => void;
  onRead?: () => void;
  refreshKey?: number;
}) {
  const fetcher = useApiFetcher();
  const scrollRef = useRef<ScrollView>(null);
  const skipNextAutoScroll = useRef(false);
  const holdScroll = useCallback(() => {
    skipNextAutoScroll.current = true;
  }, []);
  const {
    messages,
    loading,
    error,
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
  } = useGroupThread({
    groupId,
    fetcher,
    readOnly,
    refreshKey,
    isVisible: isAppActive,
    onRead,
    onMessagesChange,
    onPrepend: holdScroll,
  });

  function moderate(message: RoundMessageDto) {
    const author = message.user;
    if (readOnly || !author || !canModerateMessage(message, currentUserId)) return;
    Alert.alert("Message options", undefined, [
      {
        text: copy.chat.report,
        onPress: () =>
          Alert.alert(copy.chat.reportConfirmTitle, copy.chat.reportConfirmBody, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Report",
              style: "destructive",
              onPress: async () => {
                if (await report(message.id)) Alert.alert("Reported", copy.chat.reported);
              },
            },
          ]),
      },
      {
        text: copy.chat.block(author.name),
        style: "destructive",
        onPress: () =>
          Alert.alert(copy.chat.blockConfirmTitle(author.name), copy.chat.blockConfirmBody, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Block",
              style: "destructive",
              onPress: async () => {
                if (await block(author.id)) Alert.alert("Blocked", copy.chat.blocked(author.name));
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Group Chat</Text>
        <Text style={styles.hint}>Picks, accas, and trash talk</Text>
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
          <Text style={styles.empty}>No messages yet. Start the chat.</Text>
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
              onModerate={moderate}
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
  onModerate,
}: {
  message: RoundMessageDto;
  readOnly: boolean;
  canDelete: boolean;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: ReactionEmoji) => void;
  onModerate: (message: RoundMessageDto) => void;
}) {
  if (message.kind === "system") {
    return (
      <View style={styles.systemMessage}>
        {message.betNumber != null ? (
          <Text style={styles.betContext}>Bet #{message.betNumber}</Text>
        ) : null}
        <Text style={styles.systemText}>
          {message.body} · {formatTime(message.createdAt)}
        </Text>
        <ReactionBar message={message} readOnly={readOnly} onReact={onReact} />
      </View>
    );
  }
  return (
    <Pressable
      onLongPress={() => onModerate(message)}
      delayLongPress={350}
      style={styles.message}
      accessibilityHint="Long press for message options"
    >
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
    </Pressable>
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

  const usedEmojis = message.reactions.map((reaction) => reaction.emoji);
  const quickSet = new Set<string>(REACTION_EMOJIS);
  const moreEmojis = REACTION_PICKER_EMOJIS.filter((emoji) => !quickSet.has(emoji));
  const hasReactions = usedEmojis.length > 0;

  return (
    <View>
      <View style={styles.reactions}>
        {usedEmojis.map((emoji) => {
          const reaction = byEmoji.get(emoji)!;
          return (
            <Pressable
              key={emoji}
              disabled={readOnly}
              onPress={() => onReact(message.id, emoji)}
              onLongPress={() => {
                Alert.alert(`${emoji} reactions`, reaction.userNames.join(", "));
              }}
              style={[styles.reaction, reaction.reacted && styles.reacted]}
            >
              <Text style={styles.reactionText}>
                {emoji} {reaction.count}
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
            <Text style={styles.reactTriggerText}>
              {hasReactions ? "+" : "React"}
            </Text>
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
              <Text style={styles.emojiPickerLabel}>Add a reaction</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Text style={styles.emojiPickerClose}>Close</Text>
              </Pressable>
            </View>
            <ScrollView>
              <Text style={styles.emojiSectionLabel}>Quick reactions</Text>
              <View style={styles.quickRow}>
                {REACTION_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      onReact(message.id, emoji);
                      setPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.quickOption,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.emojiOptionText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.emojiSectionLabel}>More</Text>
              <View style={styles.emojiGrid}>
                {moreEmojis.map((emoji) => (
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
              </View>
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
    flex: 1,
  },
  header: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 18, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  messages: { flex: 1, minHeight: 240, padding: 12 },
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
  betContext: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
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
  reactTriggerText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  emojiSectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  quickOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
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
  sendText: { color: colors.onAccent, fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: 12, paddingBottom: 10 },
});

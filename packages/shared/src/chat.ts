import { z } from "zod";
import { containsProfanity } from "./profanity";

/** Round chat message kinds — user banter vs. lifecycle system messages. */
export const MESSAGE_KINDS = ["user", "system"] as const;

export type MessageKind = (typeof MESSAGE_KINDS)[number];

/**
 * System-message events written at event time by the round lifecycle
 * (see docs/specs/group-chat.md). `leg_submitted` / `leg_changed` carry a
 * `legId` so the betslip row can mirror reactions on its announcement.
 */
export const SYSTEM_MESSAGE_EVENT_TYPES = [
  "leg_submitted",
  "leg_changed",
  "leg_removed",
  "round_locked",
  "leg_result",
  "round_settled",
] as const;

export type SystemMessageEventType = (typeof SYSTEM_MESSAGE_EVENT_TYPES)[number];

/** Quick picks shown at the top of the reaction picker (not inline on every message). */
export const REACTION_EMOJIS = ["🔥", "😂", "💀", "👀", "🫡", "🍀"] as const;

/** Broad picker shown by the + control. Keep defaults first for familiarity. */
export const REACTION_PICKER_EMOJIS = [
  ...REACTION_EMOJIS,
  "👍", "👎", "👏", "🙌", "🤝", "💪", "🙏", "🤞",
  "💯", "❤️", "💔", "💚", "💙", "💜", "🖤", "🤍",
  "😀", "😃", "😄", "😁", "😆", "🥹", "😊", "😇",
  "🙂", "🙃", "😉", "😍", "🥰", "😘", "😋", "😜",
  "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "🤩", "🤯",
  "😤", "😡", "🤬", "😭", "😢", "😬", "🫠", "🫣",
  "🤔", "🤷", "🤦", "🙄", "😴", "🤢", "🤮", "🤡",
  "😈", "👻", "👽", "🤖", "💩", "💥", "✨", "⚡",
  "🚀", "🎉", "🎊", "🎯", "🏆", "🥇", "🥈", "🥉",
  "⚽", "🏀", "🏈", "🎾", "🏏", "⛳", "🥊", "🏎️",
  "🍻", "🍺", "🥂", "🍾", "🍕", "🌶️", "🧂", "🐐",
  "🐍", "🦁", "🐓", "🦆", "🌈", "☀️", "🌧️", "❄️",
] as const;

export type ReactionEmoji = string;

export const MAX_MESSAGE_LENGTH = 500;

/** How many messages GET /api/rounds/[id]/messages returns per page. */
export const MESSAGE_PAGE_SIZE = 50;

/** Body a message is overwritten with on soft delete (author or group owner). */
export const DELETED_MESSAGE_BODY = "Message deleted";

export const postMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1)
    .max(MAX_MESSAGE_LENGTH)
    .refine((body) => body !== DELETED_MESSAGE_BODY, "Reserved message text")
    .refine((body) => !containsProfanity(body), {
      message: "Naughty naughty — profanity not allowed",
    }),
});

/** Query params for the paginated thread — `after` is a message id cursor. */
export const messagesQuerySchema = z.object({
  after: z.string().min(1).optional(),
  before: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).refine((query) => !(query.after && query.before), {
  message: "Use either after or before, not both",
});

const emojiCodePointPattern =
  /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3)/u;

/** Accept one displayed emoji, including flags, skin tones and ZWJ families. */
export function isSingleEmoji(value: string): boolean {
  const emoji = value.trim();
  if (!emoji || emoji.length > 32 || !emojiCodePointPattern.test(emoji)) return false;
  const segments = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(emoji),
  ];
  return segments.length === 1 && segments[0]?.segment === emoji;
}

export const toggleReactionSchema = z.object({
  emoji: z.string().trim().refine(isSingleEmoji, "Choose one emoji"),
});

export type PostMessageInput = z.infer<typeof postMessageSchema>;
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;

/** One message in a round thread, as served by GET /api/rounds/[id]/messages. */
export type RoundMessageDto = {
  id: string;
  roundId: string;
  kind: MessageKind;
  body: string;
  /** Null for user messages. */
  eventType: SystemMessageEventType | null;
  /** Set on leg announcement system messages (leg_submitted / leg_changed). */
  legId: string | null;
  /** Null for system messages. */
  user: { id: string; name: string } | null;
  createdAt: string;
  reactions: MessageReactionSummary[];
};

/** Aggregated reactions for one emoji on one message. */
export type MessageReactionSummary = {
  emoji: ReactionEmoji;
  count: number;
  /** Display names, for who-reacted on hover / long-press. */
  userNames: string[];
  /** Whether the requesting user has this reaction on. */
  reacted: boolean;
};

/** GET /api/rounds/[id]/messages response — ordered oldest-first (newest last). */
export type RoundMessagesResponse = {
  messages: RoundMessageDto[];
  hasMore?: boolean;
  /** Latest pick announcement per leg, for betslip reaction mirroring. */
  legAnnouncements?: RoundMessageDto[];
};

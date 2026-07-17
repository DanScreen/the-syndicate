import type {
  ReactionEmoji,
  RoundMessageDto,
  SystemMessageEventType,
  MessageKind,
} from "@tiki-acca/shared";

/** Shape of a RoundMessage row with its author selected (name only). */
export type RoundMessageWithUser = {
  id: string;
  roundId: string;
  kind: string;
  body: string;
  eventType: string | null;
  legId: string | null;
  createdAt: Date;
  user: { id: string; name: string } | null;
  reactions?: {
    emoji: string;
    userId: string;
    user: { name: string };
  }[];
};

/**
 * Map a persisted RoundMessage to the client DTO, aggregating reactions.
 */
export function serializeMessage(
  message: RoundMessageWithUser,
  requestingUserId?: string
): RoundMessageDto {
  const reactionMap = new Map<
    string,
    { emoji: ReactionEmoji; count: number; userNames: string[]; reacted: boolean }
  >();
  for (const reaction of message.reactions ?? []) {
    const current = reactionMap.get(reaction.emoji) ?? {
      emoji: reaction.emoji as ReactionEmoji,
      count: 0,
      userNames: [],
      reacted: false,
    };
    current.count += 1;
    current.userNames.push(reaction.user.name);
    if (reaction.userId === requestingUserId) current.reacted = true;
    reactionMap.set(reaction.emoji, current);
  }

  return {
    id: message.id,
    roundId: message.roundId,
    kind: message.kind as MessageKind,
    body: message.body,
    eventType: (message.eventType as SystemMessageEventType | null) ?? null,
    legId: message.legId,
    user: message.user,
    createdAt: message.createdAt.toISOString(),
    reactions: [...reactionMap.values()],
  };
}

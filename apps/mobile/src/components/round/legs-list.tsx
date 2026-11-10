import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  formatFixtureLabel,
  formatLegPick,
  formatOdds,
  legOutcomeLabel,
} from "@tiki-acca/shared";
import type {
  BetslipLinks,
  GroupLeg,
  ReactionEmoji,
  RoundMessageDto,
} from "@tiki-acca/shared";
import { useApiFetcher } from "@/api/use-api-fetcher";
import { toggleReaction } from "@tiki-acca/client";
import { colors } from "@/config";
import { Avatar } from "@/components/avatar";
import { ReactionBar } from "@/components/group-chat";
import { outcomeColors } from "./helpers";
import { styles } from "./styles";

export function LegsList({
  legs,
  legLinks,
  showOpenLinks = false,
  inProgress = false,
  showLegIndex = false,
  announcementByLegId,
  onAnnouncementChanged,
}: {
  legs: GroupLeg[];
  legLinks?: BetslipLinks["legLinks"];
  showOpenLinks?: boolean;
  inProgress?: boolean;
  showLegIndex?: boolean;
  announcementByLegId?: Map<string, RoundMessageDto>;
  onAnnouncementChanged?: (message: RoundMessageDto) => void;
}) {
  const fetcher = useApiFetcher();

  if (legs.length === 0) {
    return <Text style={styles.meta}>No legs submitted yet.</Text>;
  }

  const linkByLegId = new Map(
    (legLinks ?? []).filter((l) => l.url).map((l) => [l.legId, l.url!])
  );

  async function react(messageId: string, emoji: ReactionEmoji) {
    try {
      onAnnouncementChanged?.(await toggleReaction(fetcher, messageId, emoji));
    } catch {
      // The thread will reconcile the reaction on its next poll.
    }
  }

  return (
    <View style={styles.stack}>
      {legs.map((leg) => {
        const isVoid = leg.outcome === "void";
        const openUrl = showOpenLinks && !isVoid ? linkByLegId.get(leg.id) : undefined;
        const showOutcome = inProgress || leg.outcome !== "pending";
        const outcomeStyled = (inProgress || isVoid) && leg.outcome !== "pending";
        const oc =
          outcomeStyled
            ? outcomeColors(leg.outcome)
            : outcomeColors("pending");
        const edgeColor =
          leg.outcome === "won"
            ? colors.success
            : leg.outcome === "lost"
              ? colors.danger
              : colors.border;
        const nameLabel =
          showLegIndex && leg.legIndex != null
            ? `${leg.user.name} · leg ${leg.legIndex}`
            : leg.user.name;

        return (
          <View
            key={leg.id}
            style={[
              localStyles.legCard,
              outcomeStyled
                ? { borderColor: oc.border, backgroundColor: oc.bg }
                : null,
              { borderLeftColor: edgeColor },
            ]}
          >
            <View style={localStyles.legRow}>
              <Avatar name={leg.user.name} userId={leg.user.id} size={36} />
              <View style={localStyles.legMain}>
                <Text style={localStyles.legSelection}>{formatLegPick(leg)}</Text>
                <Text style={localStyles.legFixture}>{formatFixtureLabel(leg)}</Text>
                <Text style={localStyles.legMeta}>
                  {nameLabel}
                  {leg.competition ? ` · ${leg.competition}` : ""}
                </Text>
              </View>
              <View style={localStyles.legRight}>
                <View style={localStyles.oddsPill}>
                  <Text style={localStyles.oddsText}>{formatOdds(leg.odds)}</Text>
                </View>
                {showOutcome ? (
                  <View
                    style={[
                      styles.outcomeBadge,
                      outcomeStyled
                        ? { borderColor: oc.border, backgroundColor: oc.bg }
                        : null,
                    ]}
                  >
                    <Text style={[styles.outcomeText, { color: oc.text }]}>
                      {legOutcomeLabel(leg.outcome)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            {inProgress ? (
              <Text style={[styles.meta, localStyles.lockedNote]}>
                Locked at {leg.bookmakerName}
              </Text>
            ) : null}
            {announcementByLegId?.get(leg.id) ? (
              <ReactionBar
                message={announcementByLegId.get(leg.id)!}
                onReact={react}
              />
            ) : null}
            {openUrl ? (
              <Pressable onPress={() => Linking.openURL(openUrl)} style={styles.openLink}>
                <Text style={styles.openLinkText}>Open leg</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const localStyles = StyleSheet.create({
  legCard: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
  },
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  legSelection: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  legFixture: {
    color: colors.muted,
    fontSize: 13,
  },
  legMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  legRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  oddsPill: {
    borderRadius: 999,
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  oddsText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  lockedNote: {
    marginTop: 8,
    fontSize: 12,
  },
});

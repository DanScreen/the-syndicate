import {
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  formatFixtureLabel,
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
        const openUrl = showOpenLinks ? linkByLegId.get(leg.id) : undefined;
        const showOutcome = inProgress || leg.outcome !== "pending";
        const oc =
          inProgress && leg.outcome !== "pending"
            ? outcomeColors(leg.outcome)
            : outcomeColors("pending");
        const nameLabel =
          showLegIndex && leg.legIndex != null
            ? `${leg.user.name} · leg ${leg.legIndex}`
            : leg.user.name;

        return (
          <View
            key={leg.id}
            style={[
              styles.legCard,
              inProgress && leg.outcome !== "pending"
                ? { borderColor: oc.border, backgroundColor: oc.bg }
                : null,
            ]}
          >
            <View style={styles.legHeader}>
              <Text style={styles.legUser}>{nameLabel}</Text>
              <View style={styles.legHeaderRight}>
                {showOutcome ? (
                  <View
                    style={[
                      styles.outcomeBadge,
                      inProgress && leg.outcome !== "pending"
                        ? { borderColor: oc.border, backgroundColor: oc.bg }
                        : null,
                    ]}
                  >
                    <Text style={[styles.outcomeText, { color: oc.text }]}>
                      {legOutcomeLabel(leg.outcome)}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.odds}>{formatOdds(leg.odds)}</Text>
              </View>
            </View>
            <Text style={styles.legPick}>
              {formatFixtureLabel(leg)} · {leg.marketLabel}: {leg.selectionLabel}
            </Text>
            <Text style={styles.meta}>
              {leg.competition ?? ""}
              {inProgress ? ` · Locked at ${leg.bookmakerName}` : ""}
            </Text>
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

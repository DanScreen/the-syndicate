import {
  activeBetProgressLabel,
  activeBetStatusLabel,
  deriveHomeCardState,
  formatKickoff,
  formatLegPoints,
  formatOdds,
  formatRoundStatusBadge,
  legOutcomeShortLabel,
  yourLegStatusMessage,
} from "@tiki-acca/shared";
import type {
  GroupSummary,
  GroupSummaryActiveBet,
  GroupSummaryActiveLeg,
} from "@tiki-acca/shared";
import { Avatar } from "@/components/avatar";
import { pointsStyle } from "@/components/round/helpers";
import { Button } from "@/components/ui";
import { colors } from "@/config";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function HomeGroupCard({
  group,
  onOpen,
}: {
  group: GroupSummary;
  onOpen: () => void;
}) {
  const legs = group.activeLegs ?? [];
  const multi = group.activeBetCount > 1;
  const { state, bet } = deriveHomeCardState(group);
  const round = group.activeRound;
  const waitingText = yourLegStatusMessage(group.status, group.yourLeg, {
    yourLegCount: group.yourLegCount,
    legsPerMember: round?.legsPerMember ?? group.legsPerMember ?? 1,
    unlimitedLegs: bet?.unlimitedLegs ?? false,
    roundLegCount: legs.length,
  });
  const needsPick = state === "needs-pick";
  // Nobody has picked yet: keep the card calm (no accent border, no "needed" line).
  const quietPick = needsPick && legs.length === 0;
  const hasProgressLine = bet != null && (state === "waiting" || state === "betslip");
  const hasBetslip = legs.length > 0;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
    >
        <View style={[styles.card, needsPick && !quietPick && styles.cardNeedsPick]}>
          <View style={styles.row}>
            <Text style={styles.groupName}>{group.name}</Text>
            <View style={styles.badgeRow}>
              {group.unreadMessageCount > 0 ? (
                <Text style={styles.unreadBadge}>{group.unreadMessageCount} new</Text>
              ) : null}
              <Text style={styles.badge}>
                {multi ? `${group.activeBetCount} Active` : formatRoundStatusBadge(group.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {group.memberCount} members · Owner: {group.ownerName}
            {multi ? ` · ${group.activeBetCount} active bets` : ""}
          </Text>
          <View style={styles.pointsRow}>
            <Text style={styles.points}>
              <Text style={styles.pointsLabel}>Group points: </Text>
              <Text style={pointsStyle(group.groupPoints)}>{formatLegPoints(group.groupPoints)}</Text>
            </Text>
            <Text style={styles.points}>
              <Text style={styles.pointsLabel}>Your points: </Text>
              <Text style={pointsStyle(group.points)}>{formatLegPoints(group.points)}</Text>
            </Text>
          </View>

          {multi ? (
            <>
              <ActiveBetsOverview bets={group.activeBets ?? []} />
              {needsPick ? <PickPrompt bet={bet} onPick={onOpen} quiet={quietPick} /> : null}
            </>
          ) : (
            <>
              {state === "waiting" && bet ? (
                <Text style={styles.progress}>
                  {bet.unlimitedLegs
                    ? activeBetProgressLabel(bet)
                    : `${bet.submittedLegCount} of ${bet.requiredLegCount} legs in`}
                </Text>
              ) : null}
              {state === "betslip" && bet ? (
                <Text style={styles.progress}>
                  {bet.resolvedLegCount} of {bet.submittedLegCount} legs settled
                </Text>
              ) : null}
              {hasBetslip ? (
                <Betslip
                  legs={legs}
                  odds={bet?.combinedOdds ?? round?.combinedOdds ?? null}
                  prominentOdds={state === "betslip"}
                />
              ) : null}
              {!hasProgressLine && !hasBetslip && waitingText ? (
                <Text style={styles.waiting}>{waitingText}</Text>
              ) : null}
              {needsPick ? <PickPrompt bet={bet} onPick={onOpen} quiet={quietPick} /> : null}
            </>
          )}
        </View>
    </Pressable>
  );
}

function PickPrompt({
  bet,
  onPick,
  quiet = false,
}: {
  bet: GroupSummaryActiveBet | null;
  onPick: () => void;
  /** No legs in yet: just the button and lock time, no "needed" line. */
  quiet?: boolean;
}) {
  const lock = bet?.firstKickoff ? formatKickoff(bet.firstKickoff) : null;
  return (
    <View style={styles.pickPrompt}>
      {quiet ? null : <Text style={styles.pickTitle}>Your pick is needed</Text>}
      {lock ? <Text style={styles.meta}>Locks {lock}</Text> : null}
      <Button label="Pick your leg" onPress={onPick} />
    </View>
  );
}

function Betslip({
  legs,
  odds,
  prominentOdds,
}: {
  legs: GroupSummaryActiveLeg[];
  odds: number | null;
  prominentOdds: boolean;
}) {
  return (
    <View style={styles.betslip}>
      <View style={styles.betslipHeader}>
        <Text style={styles.betslipTitle}>
          Current betslip · {legs.length} leg{legs.length === 1 ? "" : "s"}
        </Text>
        {odds != null && !prominentOdds ? (
          <Text style={styles.meta}>Acca @ {formatOdds(odds)}</Text>
        ) : null}
      </View>
      {odds != null && prominentOdds ? (
        <View style={styles.oddsBlock}>
          <Text style={styles.oddsValue}>{formatOdds(odds)}</Text>
          <Text style={styles.oddsLabel}>Acca odds</Text>
        </View>
      ) : null}
      {legs.map((leg) => (
        <LegRow key={`${leg.userId}-${leg.selectionLabel}-${leg.odds}`} leg={leg} />
      ))}
    </View>
  );
}

function LegRow({ leg }: { leg: GroupSummaryActiveLeg }) {
  const result = legOutcomeShortLabel(leg.outcome);
  const marker =
    leg.outcome === "won" ? "✓" : leg.outcome === "lost" ? "✕" : null;
  const isVoid = leg.outcome === "void";
  return (
    <View style={styles.legRow}>
      <Avatar name={leg.userName} userId={leg.userId} size={24} />
      <View style={styles.legMain}>
        <Text style={styles.legSelection} numberOfLines={1}>
          {leg.selectionLabel}
        </Text>
        <Text style={styles.legFixture} numberOfLines={1}>
          {leg.homeTeam} vs {leg.awayTeam}
        </Text>
      </View>
      <Text style={styles.legOdds}>{formatOdds(leg.odds)}</Text>
      {marker ? (
        <Text
          accessibilityLabel={result}
          style={[styles.legMarker, leg.outcome === "won" ? styles.outcomeWon : styles.outcomeLost]}
        >
          {marker}
        </Text>
      ) : isVoid ? (
        <Text accessibilityLabel={result} style={styles.legVoid}>
          {result}
        </Text>
      ) : (
        <View style={styles.legMarkerSpacer} />
      )}
    </View>
  );
}

function ActiveBetsOverview({ bets }: { bets: GroupSummaryActiveBet[] }) {
  const visible = bets.slice(0, 3);
  const hiddenCount = bets.length - visible.length;

  return (
    <View style={styles.activeBets}>
      <Text style={styles.betslipTitle}>Active bets · {bets.length}</Text>
      {visible.map((bet) => {
        const needsPick = bet.status === "open" && bet.yourLegCount < bet.legsPerMember;
        return (
          <View key={bet.id} style={styles.activeBetRow}>
            <View style={styles.activeBetMain}>
              <Text style={styles.activeBetTitle}>
                Bet #{bet.betNumber ?? "?"}
                <Text style={styles.activeBetStatus}>
                  {" · "}
                  {activeBetStatusLabel(bet)}
                </Text>
              </Text>
              <Text style={needsPick ? styles.activeBetAction : styles.activeBetProgress}>
                {activeBetProgressLabel(bet)}
              </Text>
            </View>
            {bet.combinedOdds != null ? (
              <Text style={styles.activeBetOdds}>@ {formatOdds(bet.combinedOdds)}</Text>
            ) : null}
          </View>
        );
      })}
      {hiddenCount > 0 ? <Text style={styles.moreBets}>+{hiddenCount} more</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  cardNeedsPick: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadBadge: {
    color: colors.onAccent,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "600",
  },
  badge: {
    color: colors.accent,
    fontSize: 12,
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  pointsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 8,
  },
  points: {
    fontSize: 14,
    fontWeight: "600",
  },
  pointsLabel: {
    color: colors.accent,
  },
  progress: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 10,
  },
  waiting: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  pickPrompt: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  betslip: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  betslipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  betslipTitle: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  oddsBlock: {
    alignItems: "flex-start",
  },
  oddsValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  oddsLabel: {
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legMain: {
    flex: 1,
    minWidth: 0,
  },
  legSelection: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  legFixture: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 1,
  },
  legOdds: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  legMarker: {
    width: 16,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },
  legMarkerSpacer: {
    width: 16,
  },
  legVoid: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    minWidth: 16,
    textAlign: "right",
  },
  outcomeWon: {
    color: colors.success,
  },
  outcomeLost: {
    color: colors.danger,
  },
  activeBets: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  activeBetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeBetMain: {
    flex: 1,
    minWidth: 0,
  },
  activeBetTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  activeBetStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "400",
  },
  activeBetProgress: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  activeBetAction: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  activeBetOdds: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  moreBets: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    paddingTop: 8,
  },
});

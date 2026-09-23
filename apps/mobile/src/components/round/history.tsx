import { Pressable, Text, View } from "react-native";
import {
  groupAccaRoundPoints,
  formatLegPoints,
  formatRoundStatusBadge,
  formatFixtureLabel,
  formatOdds,
  pointsToneFromOutcome,
} from "@tiki-acca/shared";
import type { HistoryRound, LegOutcome } from "@tiki-acca/shared";
import { colors } from "@/config";
import { outcomeColors, pointsStyle } from "./helpers";
import { legOutcomeLabel } from "@tiki-acca/shared";
import { styles } from "./styles";

function outcomePointsStyle(outcome: string) {
  const tone = pointsToneFromOutcome(outcome);
  if (tone === "positive") return { color: colors.success };
  if (tone === "negative") return { color: colors.danger };
  return { color: colors.muted };
}

export function RoundHistory({
  rounds,
  onViewAll,
  title = "Recent settled bets",
}: {
  rounds: HistoryRound[];
  onViewAll?: () => void;
  title?: string;
}) {
  if (rounds.length === 0) return null;

  return (
    <View style={styles.stack}>
      <View style={styles.historyTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onViewAll ? (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Text style={styles.viewAll}>Full history</Text>
          </Pressable>
        ) : null}
      </View>
      {rounds.map((round) => {
        const outcomes = round.legs.map((l) => l.outcome as LegOutcome);
        const roundPoints = groupAccaRoundPoints(outcomes, round.combinedOdds ?? 1);
        const settledLabel = round.settledAt
          ? new Date(round.settledAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : null;
        return (
          <View key={round.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.meta}>
                {formatRoundStatusBadge(round.status)}
                {settledLabel ? ` · ${settledLabel}` : ""}
              </Text>
              {round.combinedOdds ? (
                <Text style={styles.odds}>Acca @ {formatOdds(round.combinedOdds)}</Text>
              ) : null}
            </View>
            <Text style={styles.meta}>Group</Text>
            <Text style={[styles.odds, pointsStyle(roundPoints)]}>
              {formatLegPoints(roundPoints)} pts
            </Text>
            {round.legs.map((leg) => {
              const oc = outcomeColors(leg.outcome);
              return (
              <View
                key={leg.id}
                style={[
                  styles.historyLeg,
                  { borderColor: oc.border, backgroundColor: oc.bg },
                ]}
              >
                <View style={styles.historyHeader}>
                  <Text style={styles.legUser}>{leg.user.name}</Text>
                  <Text style={{ color: oc.text, fontWeight: "600", fontSize: 13 }}>
                    {legOutcomeLabel(leg.outcome)} · {formatOdds(leg.odds)}
                  </Text>
                </View>
                <Text style={styles.legPick}>{formatFixtureLabel(leg)}</Text>
                <Text style={styles.meta}>
                  {leg.marketLabel}: {leg.selectionLabel}
                </Text>
                <Text style={styles.meta}>
                  {leg.competition} ·{" "}
                  {new Date(leg.kickoff).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {leg.pointsAwarded !== 0 || leg.outcome !== "pending" ? (
                    <Text style={outcomePointsStyle(leg.outcome)}>
                      {` · ${formatLegPoints(leg.pointsAwarded)} pts`}
                    </Text>
                  ) : null}
                </Text>
              </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

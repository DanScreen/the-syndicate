import { StyleSheet, Text, View } from "react-native";
import {
  computeCompetitionRanks,
  formatLegPoints,
  formatWinRate,
  getLeaderboardTags,
} from "@tiki-acca/shared";
import { Avatar } from "@/components/avatar";
import { colors } from "@/config";
import { pointsStyle } from "./helpers";

type LeaderboardEntry = {
  userId: string;
  name: string;
  points: number;
  legsWon: number;
  legsLost: number;
  role?: string;
};

export function Leaderboard({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}) {
  const ranks = computeCompetitionRanks(entries.map((entry) => entry.points));
  const tags = getLeaderboardTags(entries);
  // Leader styling only when a single row holds first place; a tie for first gets none.
  const firstPlaceCount = ranks.filter((rank) => rank === 1).length;

  return (
    <View style={styles.stack}>
      {entries.map((entry, i) => {
        const rank = ranks[i];
        // A sole leader only, and never in a one-member (solo) group.
        const isLeader = rank === 1 && firstPlaceCount === 1 && entries.length > 1;
        const isTopThree = rank <= 3;
        const isMe = currentUserId !== undefined && entry.userId === currentUserId;
        const hitRate = formatWinRate(entry.legsWon, entry.legsLost);
        const tag = tags[entry.userId];
        const points = formatLegPoints(entry.points);

        const record = `${entry.legsWon}W · ${entry.legsLost}L`;
        const meta = [record];
        if (hitRate) meta.push(hitRate);

        const a11yParts = [`Rank ${rank}`, entry.name];
        if (entry.role === "owner") a11yParts.push("owner");
        if (tag) a11yParts.push(tag);
        a11yParts.push(`${entry.legsWon} won ${entry.legsLost} lost`, `${points} points`);

        return (
          <View
            key={entry.userId}
            accessible
            accessibilityLabel={a11yParts.join(", ")}
            style={[
              styles.row,
              isLeader && styles.rowLeader,
              isMe && styles.rowMe,
            ]}
          >
            <Text
              style={[
                styles.rank,
                isLeader && styles.rankLeader,
              ]}
            >
              {rank}
            </Text>
            <Avatar
              name={entry.name}
              userId={entry.userId}
              size={isLeader ? 44 : isTopThree ? 40 : 36}
            />
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.name, isLeader && styles.nameLeader, isTopThree && !isLeader && styles.nameTop]}
                  numberOfLines={1}
                >
                  {entry.name}
                  {entry.role === "owner" ? (
                    <Text style={styles.muted}> (owner)</Text>
                  ) : null}
                </Text>
                {tag ? (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{tag}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.muted} numberOfLines={1}>
                {meta.join(" · ")}
              </Text>
            </View>
            <Text style={[styles.points, pointsStyle(entry.points)]}>
              {points} pts
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
  },
  rowLeader: {
    borderColor: colors.warning,
  },
  rowMe: {
    backgroundColor: colors.accentMuted,
  },
  rank: {
    width: 24,
    textAlign: "center",
    color: colors.muted,
    fontWeight: "700",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  rankLeader: {
    color: colors.warning,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    flexShrink: 1,
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  nameTop: {
    fontSize: 15,
  },
  nameLeader: {
    fontSize: 16,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pillText: {
    color: colors.muted,
    fontSize: 11,
  },
  points: {
    fontWeight: "600",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});

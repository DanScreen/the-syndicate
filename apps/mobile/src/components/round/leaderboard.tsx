import { Text, View } from "react-native";
import { formatLegPoints } from "@tiki-acca/shared";
import { pointsStyle } from "./helpers";
import { styles } from "./styles";

export function Leaderboard({
  entries,
}: {
  entries: {
    userId: string;
    name: string;
    points: number;
    legsWon: number;
    legsLost: number;
    role?: string;
  }[];
}) {
  return (
    <View style={styles.stack}>
      {entries.map((entry, i) => (
        <View key={entry.userId} style={styles.leaderboardRow}>
          <View>
            <Text style={styles.legUser}>
              #{i + 1} {entry.name}
              {entry.role === "owner" ? (
                <Text style={styles.meta}> (owner)</Text>
              ) : null}
            </Text>
            <Text style={styles.meta}>
              {entry.legsWon}W / {entry.legsLost}L
            </Text>
          </View>
          <Text style={[styles.odds, pointsStyle(entry.points)]}>
            {formatLegPoints(entry.points)} pts
          </Text>
        </View>
      ))}
    </View>
  );
}

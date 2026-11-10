import { StyleSheet, Text, View } from "react-native";
import type { GroupLeg, GroupMember } from "@tiki-acca/shared";
import { formatKickoff, formatWaitingOnNames } from "@tiki-acca/shared";
import { colors } from "@/config";
import { Avatar } from "@/components/avatar";
import { styles } from "./styles";

export function RoundProgress({
  members,
  legs,
  status,
  firstKickoff,
  legsPerMember = 1,
}: {
  members: GroupMember[];
  legs: GroupLeg[];
  status: string;
  firstKickoff?: Date | null;
  legsPerMember?: number;
}) {
  const counts = new Map<string, number>();
  for (const leg of legs) {
    counts.set(leg.user.id, (counts.get(leg.user.id) ?? 0) + 1);
  }
  const pending = members.filter((m) => (counts.get(m.id) ?? 0) < legsPerMember);
  const pendingSlots = pending.reduce(
    (sum, m) => sum + (legsPerMember - (counts.get(m.id) ?? 0)),
    0
  );

  let banner = "";
  if (status === "open") {
    if (pending.length === 0) {
      banner = "Everyone has submitted. Finishing lock…";
    } else if (firstKickoff) {
      banner = `Waiting on ${pendingSlots} leg${pendingSlots === 1 ? "" : "s"}. Acca locks at first kickoff.`;
    } else {
      banner = `Waiting on ${pendingSlots} leg${pendingSlots === 1 ? "" : "s"}${
        legsPerMember > 1 ? ` (${legsPerMember} each)` : ""
      }`;
    }
  } else if (status === "locked") {
    banner = "Acca locked. Place your bet at the bookmaker.";
  } else if (status === "settled") {
    banner = "Round settled";
  }

  return (
    <View style={styles.stack}>
      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
          {status === "open" && firstKickoff && pending.length > 0 ? (
            <Text style={styles.bannerHint}>
              Locks {formatKickoff(firstKickoff.toISOString())}. Members who
              haven&apos;t finished their picks will miss this acca.
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={localStyles.memberGrid}>
        {members.map((member) => {
          const count = counts.get(member.id) ?? 0;
          const complete = count >= legsPerMember;
          const firstName = member.name.trim().split(/\s+/)[0] ?? member.name;
          const ownerLabel = member.role === "owner" ? " (owner)" : "";
          return (
            <View
              key={member.id}
              accessible
              accessibilityLabel={`${member.name}${ownerLabel}, ${complete ? "submitted" : "pending"}`}
              style={localStyles.memberCell}
            >
              <Avatar
                name={member.name}
                userId={member.id}
                size={40}
                variant={complete ? "filled" : "pending"}
              />
              <Text
                style={[
                  localStyles.memberName,
                  { color: complete ? colors.text : colors.muted },
                ]}
                numberOfLines={1}
              >
                {firstName}
              </Text>
              {legsPerMember > 1 ? (
                <Text style={localStyles.memberCount}>{`${count}/${legsPerMember}`}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
      {status === "open" && pending.length > 0 ? (
        <Text style={localStyles.waitingLine}>
          {formatWaitingOnNames(pending.map((m) => m.name))}
        </Text>
      ) : null}
    </View>
  );
}

const localStyles = StyleSheet.create({
  memberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  memberCell: {
    alignItems: "center",
    width: 64,
    gap: 4,
  },
  memberName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  memberCount: {
    color: colors.muted,
    fontSize: 11,
  },
  waitingLine: {
    color: colors.muted,
    fontSize: 13,
  },
});

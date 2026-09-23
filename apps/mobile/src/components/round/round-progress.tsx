import { Text, View } from "react-native";
import type { GroupLeg, GroupMember } from "@tiki-acca/shared";
import { formatKickoff } from "@tiki-acca/shared";
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
      {members.map((member) => {
        const count = counts.get(member.id) ?? 0;
        const complete = count >= legsPerMember;
        return (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberName}>
              {member.name}
              {member.role === "owner" ? " (owner)" : ""}
            </Text>
            <Text style={complete ? styles.submitted : styles.meta}>
              {legsPerMember === 1
                ? complete
                  ? "Submitted"
                  : "Pending"
                : `${count}/${legsPerMember}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

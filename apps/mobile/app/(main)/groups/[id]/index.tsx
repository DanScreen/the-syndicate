import { useAuth } from "@/auth/AuthProvider";
import {
  AccaSummary,
  LegsList,
  RoundHistory,
  RoundProgress,
  SettleRoundForm,
  SubmitLegForm,
} from "@/components/group-round";
import { ErrorText } from "@/components/ui";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GroupRoundScreen() {
  const { token, user } = useAuth();
  const { data, error, reload } = useGroupData();
  const [refreshing, setRefreshing] = useState(false);

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const round = data.activeRound;
  const members = data.group.members ?? [];
  const myLeg = round?.legs.find((l) => l.user.id === user?.id);
  const canSubmit = round?.status === "open" && !myLeg && user?.id;
  const isLocked = round?.status === "locked";
  const isOpen = round?.status === "open";
  const resolvedLegs = round?.legs.filter((l) => l.outcome !== "pending").length ?? 0;
  const lockedBookmakerName =
    round?.accaBookmakerRankings?.find((r) => r.bookmakerId === round.bestBookmakerId)
      ?.bookmakerName ?? round?.legs[0]?.bookmakerName;

  let lockedBanner = "Acca locked — place your bet at the bookmaker";
  if (isLocked && round) {
    if (resolvedLegs > 0 && resolvedLegs < round.legs.length) {
      lockedBanner = `Acca in progress — ${resolvedLegs} of ${round.legs.length} legs settled`;
    } else if (resolvedLegs === round.legs.length && round.legs.length > 0) {
      lockedBanner = "All legs settled — acca will finalize shortly";
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {isOpen && round && members.length > 0 ? (
        <View style={styles.section}>
          <RoundProgress members={members} legs={round.legs} status={round.status} />
        </View>
      ) : null}

      {isLocked ? (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedBannerText}>{lockedBanner}</Text>
        </View>
      ) : null}

      {round ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Picks</Text>
          <LegsList
            legs={round.legs}
            legLinks={data.betslipLinks?.legLinks}
            showOpenLinks={isLocked && resolvedLegs === 0}
            inProgress={isLocked}
          />
        </View>
      ) : null}

      {isLocked && round?.combinedOdds ? (
        <AccaSummary
          combinedOdds={round.combinedOdds}
          bookmakerName={lockedBookmakerName}
          singleBookmaker={Boolean(round.bestBookmakerId)}
          bookmakerRankings={round.accaBookmakerRankings ?? []}
          betslipLink={resolvedLegs === 0 ? data.betslipLink : null}
          showBookmakerCompare={resolvedLegs === 0}
        />
      ) : null}

      {canSubmit && round && token ? (
        <SubmitLegForm roundId={round.id} token={token} onSubmitted={reload} />
      ) : null}

      {isLocked && data.isOwner && round && token ? (
        <SettleRoundForm round={round} token={token} onSettled={reload} />
      ) : null}

      {data.recentRounds && data.recentRounds.length > 0 ? (
        <View style={styles.section}>
          <RoundHistory rounds={data.recentRounds} />
        </View>
      ) : null}

      <ErrorText message={error} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  lockedBanner: {
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(20, 83, 45, 0.4)",
    borderRadius: 10,
    padding: 12,
  },
  lockedBannerText: {
    color: colors.accent,
    fontSize: 14,
  },
});

import { useAuth } from "@/auth/AuthProvider";
import {
  AccaSummary,
  LegsList,
  RoundHistory,
  RoundProgress,
  SubmitLegForm,
} from "@/components/group-round";
import { Button, Card, ErrorText } from "@/components/ui";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function formatCutoff(date: Date) {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GroupRoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const { data, error, reload } = useGroupData();
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);

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

  // Picks can be edited until the first match in the acca kicks off.
  const firstKickoff =
    round && round.legs.length > 0
      ? new Date(Math.min(...round.legs.map((l) => new Date(l.kickoff).getTime())))
      : null;
  const editWindowOpen =
    (isOpen || isLocked) && (!firstKickoff || Date.now() < firstKickoff.getTime());
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
          <RoundProgress
            members={members}
            legs={round.legs}
            status={round.status}
            firstKickoff={firstKickoff}
          />
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

      {(() => {
        const rankings = round?.accaBookmakerRankings ?? [];
        const combinedOdds = round?.combinedOdds ?? rankings[0]?.combinedOdds ?? null;
        const bestBookmakerId = round?.bestBookmakerId ?? rankings[0]?.bookmakerId ?? null;
        const bookmakerName =
          rankings.find((r) => r.bookmakerId === bestBookmakerId)?.bookmakerName ??
          lockedBookmakerName;
        const show =
          Boolean(combinedOdds) &&
          (isLocked || (isOpen && (round?.legs.length ?? 0) > 0 && rankings.length > 0));
        if (!show || combinedOdds == null) return null;
        return (
          <AccaSummary
            combinedOdds={combinedOdds}
            bookmakerId={bestBookmakerId}
            bookmakerName={bookmakerName}
            singleBookmaker={Boolean(bestBookmakerId)}
            bookmakerRankings={rankings}
            betslipLink={
              isLocked && resolvedLegs === 0
                ? data.betslipLink
                : isOpen
                  ? data.betslipLink
                  : null
            }
            showBookmakerCompare={isOpen}
            preview={isOpen}
          />
        );
      })()}

      {canSubmit && round && token ? (
        <SubmitLegForm roundId={round.id} token={token} onSubmitted={reload} />
      ) : null}

      {myLeg && editWindowOpen && !editing ? (
        <Card>
          <Text style={styles.editTitle}>
            Your pick: {myLeg.selectionLabel} ({myLeg.odds})
          </Text>
          <Text style={styles.editMeta}>
            You can change it until the first kickoff
            {firstKickoff ? ` — ${formatCutoff(firstKickoff)}` : ""}.
            {isLocked ? " Changing a pick reprices the whole acca at current odds." : ""}
          </Text>
          <Button label="Change my pick" onPress={() => setEditing(true)} variant="secondary" />
        </Card>
      ) : null}

      {myLeg && editWindowOpen && editing && round && token ? (
        <SubmitLegForm
          roundId={round.id}
          token={token}
          editLegId={myLeg.id}
          onSubmitted={() => {
            setEditing(false);
            void reload();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : null}

      {data.recentRounds && data.recentRounds.length > 0 ? (
        <View style={styles.section}>
          <RoundHistory
            rounds={data.recentRounds}
            onViewAll={() => router.push(`/(main)/groups/${id}/history`)}
          />
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
  editTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  editMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
});

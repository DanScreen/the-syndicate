import { useAuth } from "@/auth/AuthProvider";
import {
  AccaSummary,
  LegsList,
  RoundHistory,
  RoundProgress,
  SubmitLegForm,
} from "@/components/group-round";
import { RoundThread } from "@/components/group-chat";
import type { RoundMessageDto } from "@tiki-acca/shared";
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
  const { data, error, reload, markChatRead } = useGroupData();
  const [refreshing, setRefreshing] = useState(false);
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const [roundMessages, setRoundMessages] = useState<RoundMessageDto[]>([]);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const round = data.activeRound;
  const members = data.group.members ?? [];
  const legsPerMember = round?.legsPerMember ?? data.group.legsPerMember ?? 1;
  const myLegs = round?.legs.filter((l) => l.user.id === user?.id) ?? [];
  const canSubmitMore =
    round?.status === "open" && myLegs.length < legsPerMember && Boolean(user?.id);
  const isLocked = round?.status === "locked";
  const isOpen = round?.status === "open";

  const firstKickoff =
    round && round.legs.length > 0
      ? new Date(Math.min(...round.legs.map((l) => new Date(l.kickoff).getTime())))
      : null;
  const editWindowOpen =
    (isOpen || isLocked) && (!firstKickoff || Date.now() < firstKickoff.getTime());
  // The bet is underway once the first fixture kicks off (betting has closed).
  const accaStarted = Boolean(firstKickoff && Date.now() >= firstKickoff.getTime());
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

  const nextSlot = myLegs.length + 1;
  const announcementByLegId = new Map<string, RoundMessageDto>();
  for (const message of roundMessages) {
    if (
      message.legId &&
      (message.eventType === "leg_submitted" || message.eventType === "leg_changed")
    ) {
      announcementByLegId.set(message.legId, message);
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
            legsPerMember={legsPerMember}
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
          {legsPerMember > 1 ? (
            <Text style={styles.meta}>{legsPerMember} legs each this round</Text>
          ) : null}
          <LegsList
            legs={round.legs}
            legLinks={data.betslipLinks?.legLinks}
            showOpenLinks={isLocked && resolvedLegs === 0}
            inProgress={isLocked}
            showLegIndex={legsPerMember > 1}
            announcementByLegId={announcementByLegId}
            token={token ?? undefined}
            onAnnouncementChanged={(updated) => {
              setRoundMessages((current) =>
                current.map((message) =>
                  message.id === updated.id ? updated : message
                )
              );
              setChatRefreshKey((key) => key + 1);
            }}
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
            betslipLinkQuality={data.betslipLinks?.primaryLinkQuality ?? null}
            betslipHasAllLegLinks={data.betslipLinks?.primaryHasAllLegLinks ?? false}
            legCount={round?.legs.length ?? 1}
            // Show the ranked best-odds-across-bookmakers list while open
            // (provisional) and once locked (odds captured at lock) — locked is
            // when members go place the bet, so the comparison is essential.
            // Collapse it once the bet is underway (past first kickoff).
            showBookmakerCompare={isOpen || isLocked}
            compareDefaultOpen={!accaStarted}
            preview={isOpen}
          />
        );
      })()}

      {canSubmitMore && !editingLegId && round && token ? (
        <SubmitLegForm
          roundId={round.id}
          token={token}
          onSubmitted={reload}
          existingLegs={round.legs}
          title={
            legsPerMember > 1
              ? `Submit leg ${nextSlot} of ${legsPerMember}`
              : undefined
          }
        />
      ) : null}

      {myLegs.length > 0 && editWindowOpen && !editingLegId ? (
        <Card>
          <Text style={styles.editTitle}>Your picks</Text>
          <Text style={styles.editMeta}>
            You can change them until the first kickoff
            {firstKickoff ? ` — ${formatCutoff(firstKickoff)}` : ""}.
            {isLocked ? " Changing a pick reprices the whole acca at current odds." : ""}
          </Text>
          {myLegs.map((leg) => (
            <View key={leg.id} style={styles.myLegRow}>
              <Text style={styles.myLegText}>
                {legsPerMember > 1 ? `Leg ${leg.legIndex ?? ""}: ` : ""}
                {leg.selectionLabel} ({leg.odds})
              </Text>
              <Button
                label="Change"
                onPress={() => setEditingLegId(leg.id)}
                variant="secondary"
              />
            </View>
          ))}
        </Card>
      ) : null}

      {editingLegId && editWindowOpen && round && token ? (
        <SubmitLegForm
          roundId={round.id}
          token={token}
          editLegId={editingLegId}
          existingLegs={round.legs}
          onSubmitted={() => {
            setEditingLegId(null);
            void reload();
          }}
          onCancel={() => setEditingLegId(null)}
          title={
            legsPerMember > 1
              ? `Change leg ${
                  myLegs.find((l) => l.id === editingLegId)?.legIndex ?? ""
                }`
              : undefined
          }
        />
      ) : null}

      {round && token ? (
        <RoundThread
          roundId={round.id}
          token={token}
          currentUserId={user?.id}
          isOwner={data.isOwner}
          onMessagesChange={setRoundMessages}
          onRead={markChatRead}
          refreshKey={chatRefreshKey}
        />
      ) : null}

      {data.recentRounds && data.recentRounds.length > 0 ? (
        <View style={styles.section}>
          <RoundHistory
            rounds={data.recentRounds}
            onViewAll={() => router.push(`/(main)/groups/${id}/history`)}
            token={token ?? undefined}
          />
        </View>
      ) : null}

      <ErrorText message={error} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  section: { gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 13 },
  lockedBanner: {
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(20, 83, 45, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lockedBannerText: { color: colors.accent, fontSize: 14 },
  editTitle: { color: colors.text, fontWeight: "600", marginBottom: 4 },
  editMeta: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  myLegRow: { gap: 8, marginBottom: 10 },
  myLegText: { color: colors.text, fontSize: 14 },
});

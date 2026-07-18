import { formatOdds } from "@tiki-acca/shared";
import { ApiError, api } from "@/api/client";
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
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  const [removingLegId, setRemovingLegId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [roundMessages, setRoundMessages] = useState<RoundMessageDto[]>([]);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [creatingRound, setCreatingRound] = useState(false);
  const [createRoundError, setCreateRoundError] = useState("");

  const activeRounds =
    data?.activeRounds?.length
      ? data.activeRounds
      : data?.activeRound
        ? [data.activeRound]
        : [];
  useEffect(() => {
    if (activeRounds.length === 0) return;
    if (!activeRounds.some((round) => round.id === selectedRoundId)) {
      setSelectedRoundId(activeRounds[0]!.id);
    }
  }, [activeRounds, selectedRoundId]);
  useEffect(() => {
    setEditingLegId(null);
    setRemoveError("");
    setRoundMessages([]);
    setChatRefreshKey(0);
  }, [selectedRoundId]);

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const round =
    activeRounds.find((item) => item.id === selectedRoundId) ??
    activeRounds[0] ??
    null;
  const members = data.group.members ?? [];
  const legsPerMember = round?.legsPerMember ?? data.group.legsPerMember ?? 1;
  const myLegs = round?.legs.filter((l) => l.user.id === user?.id) ?? [];
  const canSubmitMore =
    round?.status === "open" && myLegs.length < legsPerMember && Boolean(user?.id);
  const isLocked = round?.status === "locked";
  const isOpen = round?.status === "open";
  const activeBetLimit = data.group.maxActiveBets ?? 1;
  const emptyOpenBet = activeRounds.some(
    (item) => item.status === "open" && item.legs.length === 0
  );
  const canCreateRound =
    activeBetLimit > 1 &&
    activeRounds.length < activeBetLimit &&
    !emptyOpenBet;

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

  async function createRound() {
    if (!token || !data) return;
    setCreatingRound(true);
    setCreateRoundError("");
    try {
      const body = await api<{ round: { id: string } }>(
        `/api/groups/${data.group.id}/rounds`,
        { method: "POST", token }
      );
      await reload();
      setSelectedRoundId(body.round.id);
    } catch (error) {
      setCreateRoundError(
        error instanceof ApiError ? error.message : "Failed to create bet"
      );
    } finally {
      setCreatingRound(false);
    }
  }

  async function removeLeg(legId: string) {
    if (!token) return;

    setRemovingLegId(legId);
    setRemoveError("");
    try {
      await api(`/api/legs/${legId}`, { method: "DELETE", token });
      await reload();
      setChatRefreshKey((key) => key + 1);
    } catch (e) {
      setRemoveError(
        e instanceof ApiError ? e.message : "Failed to remove leg"
      );
    } finally {
      setRemovingLegId(null);
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
      {activeBetLimit > 1 ? (
        <Card>
          <View style={styles.activeBetsHeader}>
            <View>
              <Text style={styles.activeBetsTitle}>Active Bets</Text>
              <Text style={styles.meta}>
                {activeRounds.length} of {activeBetLimit} available
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!canCreateRound || creatingRound}
              onPress={() => void createRound()}
              style={({ pressed }) => [
                styles.newBetButton,
                (!canCreateRound || creatingRound) && styles.newBetButtonDisabled,
                pressed && canCreateRound && styles.newBetButtonPressed,
              ]}
            >
              <Text style={styles.newBetButtonText}>
                {creatingRound ? "Creating…" : "New Bet"}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.betSwitcher}
          >
            {activeRounds.map((item) => {
              const selected = item.id === round?.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedRoundId(item.id)}
                  style={[
                    styles.betOption,
                    selected && styles.betOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.betOptionTitle,
                      selected && styles.betOptionTitleActive,
                    ]}
                  >
                    Bet #{item.betNumber ?? "—"}
                  </Text>
                  <Text style={styles.betOptionMeta}>
                    {item.status === "open" ? "Open" : "Locked"} ·{" "}
                    {item.legs.length} leg{item.legs.length === 1 ? "" : "s"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {!canCreateRound &&
          activeRounds.length < activeBetLimit &&
          emptyOpenBet ? (
            <Text style={styles.betRule}>
              Add a leg to the empty open bet before creating another.
            </Text>
          ) : null}
          <ErrorText message={createRoundError} />
        </Card>
      ) : null}

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
            legLinks={(round.betslipLinks ?? data.betslipLinks)?.legLinks}
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
                ? round?.betslipLink ?? data.betslipLink
                : isOpen
                  ? round?.betslipLink ?? data.betslipLink
                  : null
            }
            betslipLinkQuality={
              (round?.betslipLinks ?? data.betslipLinks)?.primaryLinkQuality ?? null
            }
            betslipHasAllLegLinks={
              (round?.betslipLinks ?? data.betslipLinks)?.primaryHasAllLegLinks ?? false
            }
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
            You can change {isOpen ? "or remove " : ""}them until the first kickoff
            {firstKickoff ? ` — ${formatCutoff(firstKickoff)}` : ""}.
            {isLocked ? " Changing a pick reprices the whole acca at current odds." : ""}
          </Text>
          <ErrorText message={removeError} />
          {myLegs.map((leg) => (
            <View key={leg.id} style={styles.myLegRow}>
              <Text style={styles.myLegText}>
                {legsPerMember > 1 ? `Leg ${leg.legIndex ?? ""}: ` : ""}
                {leg.selectionLabel} ({formatOdds(leg.odds)})
              </Text>
              <View style={styles.myLegActions}>
                <Button
                  label="Change"
                  onPress={() => setEditingLegId(leg.id)}
                  variant="secondary"
                />
                {isOpen ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={removingLegId === leg.id}
                    onPress={() =>
                      Alert.alert(
                        "Remove this leg?",
                        `${leg.selectionLabel} will be removed from the group acca.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => void removeLeg(leg.id),
                          },
                        ]
                      )
                    }
                    style={({ pressed }) => [
                      styles.removeButton,
                      removingLegId === leg.id && styles.removeButtonDisabled,
                      pressed && styles.removeButtonPressed,
                    ]}
                  >
                    <Text style={styles.removeButtonText}>
                      {removingLegId === leg.id ? "Removing…" : "Remove"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
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
          key={round.id}
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
  activeBetsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  activeBetsTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  newBetButton: {
    borderRadius: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  newBetButtonDisabled: { opacity: 0.45 },
  newBetButtonPressed: { opacity: 0.8 },
  newBetButtonText: { color: colors.onAccent, fontSize: 13, fontWeight: "600" },
  betSwitcher: { gap: 8, paddingTop: 12, paddingBottom: 4 },
  betOption: {
    minWidth: 116,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  betOptionActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(20, 83, 45, 0.4)",
  },
  betOptionTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  betOptionTitleActive: { color: colors.accent },
  betOptionMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  betRule: { color: colors.muted, fontSize: 12, marginTop: 8 },
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
  myLegActions: { gap: 8 },
  removeButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  removeButtonPressed: { opacity: 0.75 },
  removeButtonDisabled: { opacity: 0.5 },
  removeButtonText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
});

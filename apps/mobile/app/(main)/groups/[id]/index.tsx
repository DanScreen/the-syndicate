import {
  SOLO_MAX_LEGS,
  announcementsByLegId,
  changeLegTitle,
  deriveRoundView,
  formatKickoff,
  formatOdds,
  legAddedCelebration,
} from "@tiki-acca/shared";
import { useApiFetcher } from "@/api/use-api-fetcher";
import { useAuth } from "@/auth/AuthProvider";
import { AccaSummary } from "@/components/round/acca-summary";
import { RoundHistory } from "@/components/round/history";
import { LegsList } from "@/components/round/legs-list";
import { RoundProgress } from "@/components/round/round-progress";
import { SubmitLegForm } from "@/components/round/submit-leg-form";
import type { RoundMessageDto } from "@tiki-acca/shared";
import { Button, Card, ErrorText } from "@/components/ui";
import { colors } from "@/config";
import {
  ApiError,
  createRound,
  lockRound,
  removeLeg,
  useGroupData,
} from "@tiki-acca/client";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GroupRoundScreen() {
  const { user } = useAuth();
  const fetcher = useApiFetcher();
  const { data, error, reload } = useGroupData();
  const [refreshing, setRefreshing] = useState(false);
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const [removingLegId, setRemovingLegId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [lockingRound, setLockingRound] = useState(false);
  const [lockError, setLockError] = useState("");
  const [legAnnouncements, setLegAnnouncements] = useState<RoundMessageDto[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [creatingRound, setCreatingRound] = useState(false);
  const [createRoundError, setCreateRoundError] = useState("");
  const [legCelebration, setLegCelebration] = useState<"Leg added" | "All legs added" | null>(
    null
  );
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.92)).current;
  const previousRoundRef = useRef<string | null>(null);
  const previousLegCountRef = useRef(0);

  const view = data
    ? deriveRoundView({ data, selectedRoundId, userId: user?.id })
    : null;
  const activeRounds = view?.activeRounds;
  useEffect(() => {
    if (!activeRounds || activeRounds.length === 0) return;
    if (!activeRounds.some((round) => round.id === selectedRoundId)) {
      setSelectedRoundId(activeRounds[0]!.id);
    }
  }, [activeRounds, selectedRoundId]);
  useEffect(() => {
    setEditingLegId(null);
    setRemoveError("");
  }, [selectedRoundId]);
  useEffect(() => {
    setLegAnnouncements(data?.legAnnouncements ?? []);
  }, [data?.legAnnouncements]);

  const userLegCount = view?.userLegs.length ?? 0;
  const legsPerMember = view?.legsPerMember ?? 1;
  const selectedRoundKey = view?.round?.id ?? null;
  const selectedRoundStatus = view?.round?.status ?? null;

  useEffect(() => {
    if (!selectedRoundKey) return;
    if (previousRoundRef.current !== selectedRoundKey) {
      previousRoundRef.current = selectedRoundKey;
      previousLegCountRef.current = userLegCount;
      setLegCelebration(null);
      return;
    }

    const previousCount = previousLegCountRef.current;
    if (selectedRoundStatus === "open" && userLegCount > previousCount && !editingLegId) {
      setLegCelebration(legAddedCelebration(userLegCount, legsPerMember));
    }
    previousLegCountRef.current = userLegCount;
  }, [editingLegId, legsPerMember, userLegCount, selectedRoundKey, selectedRoundStatus]);

  useEffect(() => {
    if (!legCelebration) return;
    celebrationOpacity.setValue(0);
    celebrationScale.setValue(0.92);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(celebrationOpacity, {
          toValue: 1,
          duration: 190,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(celebrationScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.back(1.3)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(950),
      Animated.timing(celebrationOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setLegCelebration(null);
      }
    });
  }, [celebrationOpacity, celebrationScale, legCelebration]);

  if (!data || !view) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { round, acca, isLocked, isOpen, isSolo, firstKickoff, editWindowOpen } = view;
  const myLegs = view.userLegs;
  const members = data.group.members ?? [];
  const announcementByLegId = announcementsByLegId(legAnnouncements);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  async function createBet() {
    if (!data) return;
    setCreatingRound(true);
    setCreateRoundError("");
    try {
      const body = await createRound(fetcher, data.group.id);
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

  async function lockSoloRound() {
    if (!round) return;

    Alert.alert(
      "Lock this acca?",
      `You have ${round.legs.length} leg${
        round.legs.length === 1 ? "" : "s"
      }. You won't be able to add more.`,
      [
        { text: "Keep building", style: "cancel" },
        {
          text: "Lock acca",
          onPress: async () => {
            setLockingRound(true);
            setLockError("");
            try {
              await lockRound(fetcher, round.id);
              await reload();
            } catch (e) {
              setLockError(
                e instanceof ApiError ? e.message : "Failed to lock acca"
              );
            } finally {
              setLockingRound(false);
            }
          },
        },
      ]
    );
  }

  async function removeUserLeg(legId: string) {
    setRemovingLegId(legId);
    setRemoveError("");
    try {
      await removeLeg(fetcher, legId);
      await reload();
    } catch (e) {
      setRemoveError(
        e instanceof ApiError ? e.message : "Failed to remove leg"
      );
    } finally {
      setRemovingLegId(null);
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
      {view.activeBetLimit > 1 ? (
        <Card>
          <View style={styles.activeBetsHeader}>
            <View>
              <Text style={styles.activeBetsTitle}>Active Bets</Text>
              <Text style={styles.meta}>
                {view.activeRounds.length} of {view.activeBetLimit} available
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!view.canCreateRound || creatingRound}
              onPress={() => void createBet()}
              style={({ pressed }) => [
                styles.newBetButton,
                (!view.canCreateRound || creatingRound) && styles.newBetButtonDisabled,
                pressed && view.canCreateRound && styles.newBetButtonPressed,
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
            {view.activeRounds.map((item) => {
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
          {view.showEmptyBetHint ? (
            <Text style={styles.betRule}>
              Add a leg to the empty open bet before creating another.
            </Text>
          ) : null}
          <ErrorText message={createRoundError} />
        </Card>
      ) : null}

      {view.voidBanner ? (
        <View style={styles.voidBanner}>
          <Text style={styles.voidBannerText}>{view.voidBanner}</Text>
        </View>
      ) : null}

      {isOpen && round && !isSolo && !view.reopened && members.length > 0 ? (
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
          <Text style={styles.lockedBannerText}>{view.lockedBanner}</Text>
        </View>
      ) : null}

      {round ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Picks</Text>
          {isSolo ? (
            <Text style={styles.meta}>
              Build your acca — up to {SOLO_MAX_LEGS} legs, then lock it when
              you&apos;re ready.
            </Text>
          ) : legsPerMember > 1 ? (
            <Text style={styles.meta}>{legsPerMember} legs each this round</Text>
          ) : null}
          {isSolo && isOpen && round.legs.length > 0 && !editingLegId ? (
            <View style={styles.soloLock}>
              <Button
                label={`Lock acca (${round.legs.length} leg${
                  round.legs.length === 1 ? "" : "s"
                })`}
                onPress={lockSoloRound}
                loading={lockingRound}
              />
              <Text style={styles.meta}>
                Locking freezes your combined odds and shows the best bookmaker
                for the whole acca.
              </Text>
              <ErrorText message={lockError} />
            </View>
          ) : null}
          <LegsList
            legs={round.legs}
            legLinks={view.legLinks}
            showOpenLinks={view.showOpenLinks}
            inProgress={isLocked}
            showLegIndex={view.showLegIndex}
            announcementByLegId={announcementByLegId}
            onAnnouncementChanged={(updated) => {
              setLegAnnouncements((current) =>
                current.map((message) =>
                  message.id === updated.id ? updated : message
                )
              );
            }}
          />
        </View>
      ) : null}

      {acca.show && acca.combinedOdds != null ? (
        <AccaSummary
          combinedOdds={acca.combinedOdds}
          bookmakerId={acca.bestBookmakerId}
          bookmakerName={acca.bookmakerName}
          singleBookmaker={Boolean(acca.bestBookmakerId)}
          bookmakerRankings={acca.rankings}
          betslipLink={acca.betslipLink}
          betslipLinkQuality={acca.betslipLinkQuality}
          betslipHasAllLegLinks={acca.betslipHasAllLegLinks}
          legCount={acca.legCount || 1}
          // Show the ranked best-odds-across-bookmakers list while open
          // (using current odds) and once locked (odds captured at lock) — locked is
          // when members go place the bet, so the comparison is essential.
          // Collapse it once the bet is underway (past first kickoff).
          showBookmakerCompare={isOpen || isLocked}
          compareDefaultOpen={acca.compareDefaultOpen}
          inProgress={isLocked}
          preview={isOpen}
        />
      ) : null}

      {myLegs.length > 0 && editWindowOpen && !editingLegId ? (
        <Card>
          <Text style={styles.editTitle}>Your picks</Text>
          <Text style={styles.editMeta}>
            You can change {view.canRemove ? "or remove " : ""}them until the first kickoff
            {firstKickoff ? ` — ${formatKickoff(firstKickoff)}` : ""}.
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
                  label={leg.outcome === "void" ? "Swap void pick" : "Change"}
                  onPress={() => setEditingLegId(leg.id)}
                  variant="secondary"
                />
                {view.canRemove && leg.outcome !== "void" ? (
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
                            onPress: () => void removeUserLeg(leg.id),
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

      {view.canSubmitMore && !editingLegId && round ? (
        <View style={styles.legSubmitWrap}>
          {legCelebration ? (
            <Animated.View
              style={[
                styles.legCelebration,
                { opacity: celebrationOpacity, transform: [{ scale: celebrationScale }] },
              ]}
            >
              <Text style={styles.legCelebrationText}>{legCelebration}</Text>
            </Animated.View>
          ) : null}
          <SubmitLegForm
            key={`submit-leg-${myLegs.length}`}
            roundId={round.id}
            onSubmitted={reload}
            existingLegs={round.legs}
            legSlot={view.nextSlot}
            legsPerMember={legsPerMember}
            title={view.submitTitle}
          />
        </View>
      ) : null}

      {editingLegId && editWindowOpen && round ? (
        <SubmitLegForm
          roundId={round.id}
          editLegId={editingLegId}
          existingLegs={round.legs}
          onSubmitted={() => {
            setEditingLegId(null);
            void reload();
          }}
          onCancel={() => setEditingLegId(null)}
          title={changeLegTitle(view, editingLegId)}
        />
      ) : null}

      {data.recentRounds && data.recentRounds.length > 0 ? (
        <View style={styles.section}>
          <RoundHistory
            groupId={data.group.id}
            recentRounds={data.recentRounds}
            settledRoundCount={data.settledRoundCount}
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
  soloLock: { gap: 6 },
  legSubmitWrap: { gap: 8 },
  legCelebration: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  legCelebrationText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
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
  voidBanner: {
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  voidBannerText: { color: colors.warning, fontSize: 14 },
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

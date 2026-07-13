import { ApiError, api } from "@/api/client";
import { BetslipDisclosure } from "@/components/compliance";
import { Button, Card, ErrorText, OptionRow } from "@/components/ui";
import { colors } from "@/config";
import { copy } from "@/lib/copy";
import type {
  AccaBookmakerRanking,
  BetslipLinks,
  CompetitionOption,
  CompetitionsResponse,
  Fixture,
  FixtureMarketsResponse,
  FixturesResponse,
  EditLegInput,
  GroupLeg,
  GroupMember,
  Market,
  MarketTierOption,
  SubmitLegInput,
} from "@the-syndicate/shared";
import {
  groupAccaRoundPoints,
  formatLegPoints,
  formatRoundStatusBadge,
  groupMarkets,
  sortQuotesByBestOdds,
  type LegOutcome,
} from "@the-syndicate/shared";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function legOutcomeLabel(outcome: string): string {
  if (outcome === "won") return "Won";
  if (outcome === "lost") return "Lost";
  if (outcome === "void") return "Void";
  return "Awaiting";
}

function mergeMarkets(bulk: Market[], extended: Market[]): Market[] {
  const byType = new Map<string, Market>();
  for (const market of bulk) byType.set(market.type, market);
  for (const market of extended) byType.set(market.type, market);
  return [...byType.values()];
}

function outcomeColors(outcome: string) {
  if (outcome === "won") {
    return {
      border: "rgba(34, 197, 94, 0.4)",
      bg: "rgba(34, 197, 94, 0.1)",
      text: colors.accentBright,
    };
  }
  if (outcome === "lost") {
    return {
      border: "rgba(248, 113, 113, 0.4)",
      bg: "rgba(248, 113, 113, 0.1)",
      text: colors.danger,
    };
  }
  return {
    border: colors.border,
    bg: colors.card,
    text: colors.muted,
  };
}

export function RoundProgress({
  members,
  legs,
  status,
  firstKickoff,
}: {
  members: GroupMember[];
  legs: GroupLeg[];
  status: string;
  firstKickoff?: Date | null;
}) {
  const submittedIds = new Set(legs.map((l) => l.user.id));
  const pending = members.filter((m) => !submittedIds.has(m.id));

  let banner = "";
  if (status === "open") {
    if (pending.length === 0) {
      banner = "Everyone has submitted — locking acca...";
    } else if (firstKickoff) {
      banner = `Waiting on ${pending.length} leg${pending.length === 1 ? "" : "s"} — acca locks at first kickoff`;
    } else {
      banner = `Waiting on ${pending.length} leg${pending.length === 1 ? "" : "s"}`;
    }
  } else if (status === "locked") {
    banner = "Acca locked — place your bet at the bookmaker";
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
              Locks {formatKickoff(firstKickoff.toISOString())} — members who
              haven&apos;t picked will miss this acca
            </Text>
          ) : null}
        </View>
      ) : null}
      {members.map((member) => {
        const submitted = submittedIds.has(member.id);
        return (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberName}>
              {member.name}
              {member.role === "owner" ? " (owner)" : ""}
            </Text>
            <Text style={submitted ? styles.submitted : styles.meta}>
              {submitted ? "✓ Submitted" : "Pending"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function LegsList({
  legs,
  legLinks,
  showOpenLinks = false,
  inProgress = false,
}: {
  legs: GroupLeg[];
  legLinks?: BetslipLinks["legLinks"];
  showOpenLinks?: boolean;
  inProgress?: boolean;
}) {
  if (legs.length === 0) {
    return <Text style={styles.meta}>No legs submitted yet.</Text>;
  }

  const linkByLegId = new Map(
    (legLinks ?? []).filter((l) => l.url).map((l) => [l.legId, l.url!])
  );

  return (
    <View style={styles.stack}>
      {legs.map((leg) => {
        const openUrl = showOpenLinks ? linkByLegId.get(leg.id) : undefined;
        const showOutcome = inProgress || leg.outcome !== "pending";
        const oc =
          inProgress && leg.outcome !== "pending"
            ? outcomeColors(leg.outcome)
            : outcomeColors("pending");

        return (
          <View
            key={leg.id}
            style={[
              styles.legCard,
              inProgress && leg.outcome !== "pending"
                ? { borderColor: oc.border, backgroundColor: oc.bg }
                : null,
            ]}
          >
            <View style={styles.legHeader}>
              <Text style={styles.legUser}>{leg.user.name}</Text>
              <View style={styles.legHeaderRight}>
                {showOutcome ? (
                  <View
                    style={[
                      styles.outcomeBadge,
                      inProgress && leg.outcome !== "pending"
                        ? { borderColor: oc.border, backgroundColor: oc.bg }
                        : null,
                    ]}
                  >
                    <Text style={[styles.outcomeText, { color: oc.text }]}>
                      {legOutcomeLabel(leg.outcome)}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.odds}>{leg.odds}</Text>
              </View>
            </View>
            <Text style={styles.legPick}>
              {leg.homeTeam} vs {leg.awayTeam} · {leg.marketLabel}: {leg.selectionLabel}
            </Text>
            <Text style={styles.meta}>
              {leg.competition ?? ""}
              {inProgress ? ` · Locked at ${leg.bookmakerName}` : ""}
            </Text>
            {openUrl ? (
              <Pressable onPress={() => Linking.openURL(openUrl)} style={styles.openLink}>
                <Text style={styles.openLinkText}>Open leg</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function AccaSummary({
  combinedOdds,
  bookmakerName,
  singleBookmaker,
  bookmakerRankings = [],
  betslipLink,
  showBookmakerCompare = true,
}: {
  combinedOdds: number;
  bookmakerName?: string | null;
  singleBookmaker: boolean;
  bookmakerRankings?: AccaBookmakerRanking[];
  betslipLink?: string | null;
  showBookmakerCompare?: boolean;
}) {
  const [bookmakersOpen, setBookmakersOpen] = useState(false);
  const topBookmaker = bookmakerRankings[0];
  const showCompare = showBookmakerCompare && bookmakerRankings.length > 0;

  return (
    <View style={styles.stack}>
      <View style={styles.accaCard}>
        <View style={styles.accaMain}>
          <Text style={styles.accaLabel}>Locked combined odds</Text>
          <Text style={styles.accaOdds}>{combinedOdds}</Text>
          {singleBookmaker && bookmakerName ? (
            <Text style={styles.meta}>Locked at {bookmakerName}</Text>
          ) : null}
          {!singleBookmaker ? (
            <Text style={styles.warnText}>Best per-leg odds locked at submission</Text>
          ) : null}
        </View>
        {betslipLink ? (
          <>
            <Button
              label={
                topBookmaker && bookmakerName
                  ? `Open betslip · ${bookmakerName}`
                  : "Open betslip"
              }
              onPress={() => Linking.openURL(betslipLink)}
            />
            <BetslipDisclosure />
          </>
        ) : null}
      </View>

      {showCompare ? (
        <Card>
          <Pressable
            onPress={() => setBookmakersOpen((o) => !o)}
            style={styles.compareHeader}
          >
            <Text style={styles.sectionTitle}>
              Compare bookmakers ({bookmakerRankings.length})
            </Text>
            <Text style={styles.meta}>{bookmakersOpen ? "▲" : "▼"}</Text>
          </Pressable>
          {bookmakersOpen
            ? bookmakerRankings.map((entry, index) => (
                <View
                  key={entry.bookmakerId}
                  style={[styles.rankRow, index === 0 && styles.rankRowTop]}
                >
                  <View style={styles.rankLeft}>
                    <Text style={styles.rankName}>
                      #{index + 1} {entry.bookmakerName}
                      {entry.hasAllLegLinks === false && entry.url ? (
                        <Text style={styles.warnText}> partial</Text>
                      ) : null}
                    </Text>
                  </View>
                  <View style={styles.rankRight}>
                    <Text style={index === 0 ? styles.odds : styles.meta}>
                      {entry.combinedOdds}
                    </Text>
                    {entry.url ? (
                      <Pressable onPress={() => Linking.openURL(entry.url!)}>
                        <Text style={styles.openLinkText}>Open</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            : null}
        </Card>
      ) : null}
    </View>
  );
}

export function SubmitLegForm({
  roundId,
  token,
  onSubmitted,
  editLegId,
  onCancel,
}: {
  roundId: string;
  token: string;
  onSubmitted: () => void;
  /** When set, the form edits this existing leg (PATCH) instead of submitting a new one. */
  editLegId?: string;
  onCancel?: () => void;
}) {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [competitionId, setCompetitionId] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [fixtureId, setFixtureId] = useState("");
  const [fixtureMarkets, setFixtureMarkets] = useState<Market[]>([]);
  const [loadedTiers, setLoadedTiers] = useState<string[]>([]);
  const [availableTiers, setAvailableTiers] = useState<MarketTierOption[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [loadingTierId, setLoadingTierId] = useState("");
  const [marketType, setMarketType] = useState("");
  const [selectionId, setSelectionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketsError, setMarketsError] = useState("");

  useEffect(() => {
    api<CompetitionsResponse>("/api/competitions", { token })
      .then((d) => {
        setCompetitions(d.competitions);
        if (d.competitions.length === 1) {
          setCompetitionId(d.competitions[0]!.id);
        }
      })
      .catch(() => setCompetitions([]))
      .finally(() => setLoadingCompetitions(false));
  }, [token]);

  useEffect(() => {
    if (!competitionId) {
      setFixtures([]);
      return;
    }

    setLoadingFixtures(true);
    setFixtureId("");
    setMarketType("");
    setSelectionId("");

    api<FixturesResponse>(`/api/fixtures?competition=${competitionId}`, { token })
      .then((d) => setFixtures(d.fixtures))
      .catch(() => setFixtures([]))
      .finally(() => setLoadingFixtures(false));
  }, [token, competitionId]);

  useEffect(() => {
    if (!fixtureId || !competitionId) {
      setFixtureMarkets([]);
      setLoadedTiers([]);
      setAvailableTiers([]);
      return;
    }

    setLoadingMarkets(true);
    setMarketsError("");
    setFixtureMarkets([]);
    setLoadedTiers([]);
    setMarketType("");
    setSelectionId("");

    api<FixtureMarketsResponse>(
      `/api/fixtures/${fixtureId}/markets?competition=${competitionId}&tier=core`,
      { token }
    )
      .then((d) => {
        setFixtureMarkets(d.markets ?? []);
        setLoadedTiers(["core"]);
        setAvailableTiers(d.tiers ?? []);
      })
      .catch(() => {
        setFixtureMarkets([]);
        setMarketsError("Failed to load markets");
      })
      .finally(() => setLoadingMarkets(false));
  }, [fixtureId, competitionId, token]);

  async function loadMarketTier(tierId: string) {
    if (!fixtureId || !competitionId || loadedTiers.includes(tierId)) return;

    setLoadingTierId(tierId);
    setMarketsError("");
    try {
      const data = await api<FixtureMarketsResponse>(
        `/api/fixtures/${fixtureId}/markets?competition=${competitionId}&tier=${tierId}`,
        { token }
      );
      setFixtureMarkets((prev) => {
        const byType = new Map(prev.map((m) => [m.type, m]));
        for (const market of data.markets ?? []) byType.set(market.type, market);
        return [...byType.values()];
      });
      setLoadedTiers((prev) => [...prev, tierId]);
    } catch {
      setMarketsError("Failed to load markets");
    } finally {
      setLoadingTierId("");
    }
  }

  const fixture = fixtures.find((f) => f.id === fixtureId);
  const allMarkets = useMemo(
    () => mergeMarkets(fixture?.markets ?? [], fixtureMarkets),
    [fixture, fixtureMarkets]
  );
  const marketGroups = useMemo(() => groupMarkets(allMarkets), [allMarkets]);
  const market = allMarkets.find((m) => m.type === marketType);
  const selection = market?.selections.find((s) => s.id === selectionId);

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      if (editLegId) {
        const body: EditLegInput = { competitionId, fixtureId, marketType, selectionId };
        await api(`/api/legs/${editLegId}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(body),
        });
      } else {
        const body: SubmitLegInput = {
          roundId,
          competitionId,
          fixtureId,
          marketType,
          selectionId,
        };
        await api("/api/legs", {
          method: "POST",
          token,
          body: JSON.stringify(body),
        });
      }
      onSubmitted();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : editLegId
            ? "Failed to update leg"
            : "Failed to submit leg"
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingCompetitions) {
    return (
      <Card>
        <Text style={styles.meta}>{copy.legPicker.loadingCompetitions}</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
      </Card>
    );
  }

  if (competitions.length === 0) {
    return (
      <Card>
        <Text style={styles.meta}>{copy.legPicker.noCompetitions}</Text>
      </Card>
    );
  }

  const ready = competitionId && fixtureId && marketType && selectionId;

  return (
    <Card>
      <Text style={styles.sectionTitle}>{editLegId ? "Change your leg" : "Submit your leg"}</Text>

      <Text style={styles.stepLabel}>1. Competition</Text>
      {competitions.map((c) => (
        <OptionRow
          key={c.id}
          label={c.name}
          selected={competitionId === c.id}
          onPress={() => setCompetitionId(c.id)}
        />
      ))}

      {competitionId && loadingFixtures ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
      ) : null}

      {competitionId && !loadingFixtures && fixtures.length === 0 ? (
        <Text style={styles.meta}>{copy.legPicker.noFixturesLive}</Text>
      ) : null}

      {competitionId && !loadingFixtures && fixtures.length > 0 ? (
        <>
          <Text style={styles.stepLabel}>2. Fixture</Text>
          {fixtures.map((f) => (
            <OptionRow
              key={f.id}
              label={`${f.homeTeam} vs ${f.awayTeam}`}
              subtitle={formatKickoff(f.kickoff)}
              selected={fixtureId === f.id}
              onPress={() => setFixtureId(f.id)}
            />
          ))}
        </>
      ) : null}

      {fixture ? (
        <View style={styles.stack}>
          <Text style={styles.stepLabel}>3. Market</Text>
          {loadingMarkets ? (
            <Text style={styles.meta}>{copy.legPicker.loadingMarkets}</Text>
          ) : null}
          {marketsError ? <Text style={styles.warnText}>{marketsError}</Text> : null}
          {marketGroups.map((group) => (
            <View key={group.id}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.markets.map((m) => (
                <OptionRow
                  key={m.type}
                  label={m.label}
                  selected={marketType === m.type}
                  onPress={() => {
                    setMarketType(m.type);
                    setSelectionId("");
                  }}
                />
              ))}
            </View>
          ))}
          {!loadingMarkets && availableTiers.some((t) => !loadedTiers.includes(t.id)) ? (
            <>
              <Text style={styles.groupLabel}>Load more markets</Text>
              {availableTiers
                .filter((t) => !loadedTiers.includes(t.id))
                .map((tier) => (
                  <OptionRow
                    key={tier.id}
                    label={loadingTierId === tier.id ? "Loading…" : tier.label}
                    subtitle={tier.description}
                    selected={false}
                    dashed
                    onPress={() => void loadMarketTier(tier.id)}
                  />
                ))}
            </>
          ) : null}
        </View>
      ) : null}

      {market ? (
        <>
          <Text style={styles.stepLabel}>4. Selection</Text>
          {market.selections.map((s) => {
            const top = sortQuotesByBestOdds(s.odds)[0];
            return (
              <OptionRow
                key={s.id}
                label={s.label}
                subtitle={top ? `Best ${top.odds}` : undefined}
                selected={selectionId === s.id}
                onPress={() => setSelectionId(s.id)}
              />
            );
          })}
        </>
      ) : null}

      {selection ? (
        <Text style={styles.meta}>{copy.legPicker.bestOddsHint}</Text>
      ) : null}

      <ErrorText message={error} />
      <Button
        label={editLegId ? "Update leg" : "Submit leg"}
        onPress={() => {
          if (ready) void handleSubmit();
        }}
        loading={loading}
        variant={ready ? "primary" : "secondary"}
      />
      {onCancel ? (
        <Button label="Cancel — keep my current pick" onPress={onCancel} variant="secondary" />
      ) : null}
    </Card>
  );
}

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
          <Text style={styles.odds}>{formatLegPoints(entry.points)} pts</Text>
        </View>
      ))}
    </View>
  );
}

export function RoundHistory({
  rounds,
}: {
  rounds: {
    id: string;
    status: string;
    combinedOdds: number | null;
    legs: {
      selectionLabel: string;
      outcome: string;
      odds?: number;
      pointsAwarded?: number;
    }[];
  }[];
}) {
  if (rounds.length === 0) return null;

  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>Recent rounds</Text>
      {rounds.map((round) => {
        const outcomes = round.legs.map((l) => l.outcome as LegOutcome);
        const roundPoints = groupAccaRoundPoints(outcomes, round.combinedOdds ?? 1);
        return (
          <View key={round.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.meta}>{formatRoundStatusBadge(round.status)}</Text>
              {round.combinedOdds ? (
                <Text style={styles.odds}>Locked {round.combinedOdds}</Text>
              ) : null}
            </View>
            <Text style={styles.odds}>{formatLegPoints(roundPoints)} pts</Text>
            {round.legs.map((leg, i) => (
              <Text key={i} style={styles.meta}>
                {leg.selectionLabel}
                {leg.odds != null ? ` @ ${leg.odds}` : ""} ({legOutcomeLabel(leg.outcome)})
              </Text>
            ))}
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
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  groupLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  warnText: {
    color: "#fbbf24",
    fontSize: 13,
    marginTop: 4,
  },
  banner: {
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(20, 83, 45, 0.4)",
    borderRadius: 10,
    padding: 12,
  },
  bannerText: {
    color: colors.accent,
    fontSize: 14,
  },
  bannerHint: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.85,
  },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
  },
  memberName: {
    color: colors.text,
    fontSize: 14,
  },
  submitted: {
    color: colors.accent,
    fontSize: 14,
  },
  legCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
  },
  legHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  legHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  legUser: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  legPick: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  odds: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  outcomeBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  openLink: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.5)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openLinkText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  accaCard: {
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(20, 83, 45, 0.2)",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  accaMain: {
    gap: 4,
  },
  accaLabel: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  accaOdds: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: "700",
  },
  compareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankRowTop: {
    backgroundColor: "rgba(20, 83, 45, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  rankLeft: {
    flex: 1,
  },
  rankRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankName: {
    color: colors.text,
    fontSize: 14,
  },
  settleLeg: {
    marginTop: 12,
    gap: 8,
  },
  outcomePicker: {
    flexDirection: "row",
    gap: 8,
  },
  outcomeOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outcomeOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  outcomeOptionText: {
    color: colors.muted,
    fontSize: 13,
    textTransform: "capitalize",
  },
  outcomeOptionTextSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
  leaderboardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

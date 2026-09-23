import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  findOutrightMixConflict,
  formatFixtureLabel,
  formatOdds,
  groupMarkets,
  isFixtureTaken,
  isOutrightFixtureId,
  sortQuotesByBestOdds,
  sortQuotesForDisplay,
} from "@tiki-acca/shared";
import type {
  CompetitionOption,
  CompetitionsResponse,
  Fixture,
  FixtureMarketsResponse,
  FixturesResponse,
  EditLegInput,
  Market,
  MarketTierOption,
  SubmitLegInput,
  MarketConflictLeg,
} from "@tiki-acca/shared";
import { ApiError, api } from "@/api/client";
import {
  Button,
  Card,
  ErrorText,
  OptionRow,
} from "@/components/ui";
import { colors } from "@/config";
import { copy } from "@tiki-acca/shared";
import { formatKickoff } from "@tiki-acca/shared";
import { styles } from "./styles";
import { mergeFixtureMarkets } from "@tiki-acca/shared";

export function SubmitLegForm({
  roundId,
  token,
  onSubmitted,
  editLegId,
  onCancel,
  title,
  legSlot,
  legsPerMember,
  existingLegs = [],
}: {
  roundId: string;
  token: string;
  onSubmitted: () => void;
  /** When set, the form edits this existing leg (PATCH) instead of submitting a new one. */
  editLegId?: string;
  onCancel?: () => void;
  title?: string;
  /** 1-based slot for the leg being submitted (multi-leg rounds). */
  legSlot?: number;
  /** Group quota — used for multi-leg progress copy. */
  legsPerMember?: number;
  /** Other legs already on this round — used to block occupied fixtures. */
  existingLegs?: MarketConflictLeg[];
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
      const markets = data.markets ?? [];
      setFixtureMarkets((prev) => {
        const byType = new Map(prev.map((m) => [m.type, m]));
        for (const market of markets) byType.set(market.type, market);
        return [...byType.values()];
      });
      setLoadedTiers((prev) => [...prev, tierId]);
      if (markets.length === 0) {
        const label =
          availableTiers.find((t) => t.id === tierId)?.label ?? "Those markets";
        setMarketsError(copy.legPicker.marketsEmptyTier(label));
      }
    } catch {
      setMarketsError(copy.legPicker.marketsError);
    } finally {
      setLoadingTierId("");
    }
  }

  const competition = competitions.find((c) => c.id === competitionId);
  const fixture = fixtures.find((f) => f.id === fixtureId);
  const allMarkets = useMemo(
    () => mergeFixtureMarkets(fixture?.markets ?? [], fixtureMarkets),
    [fixture, fixtureMarkets]
  );
  const marketGroups = useMemo(() => groupMarkets(allMarkets), [allMarkets]);
  const market = allMarkets.find((m) => m.type === marketType);
  const selection = market?.selections.find((s) => s.id === selectionId);
  const hasTakenFixtures = fixtures.some((f) =>
    isFixtureTaken(existingLegs, f.id, editLegId)
  );

  function resetLegSelection() {
    setFixtureId("");
    setMarketType("");
    setSelectionId("");
    setFixtureMarkets([]);
    setLoadedTiers([]);
    setAvailableTiers([]);
    setMarketsError("");
    setError("");
    if (competitions.length === 1) {
      setCompetitionId(competitions[0]!.id);
    } else {
      setCompetitionId("");
    }
  }

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
      if (!editLegId) {
        resetLegSelection();
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
      <Text style={styles.sectionTitle}>
        {title ?? (editLegId ? "Change your leg" : "Submit your leg")}
      </Text>

      {!editLegId && legsPerMember != null && legsPerMember > 1 && legSlot != null ? (
        <Text
          style={[
            styles.multiLegHint,
            legSlot > 1 && styles.multiLegHintActive,
          ]}
        >
          {legSlot === 1
            ? copy.legPicker.multiLegFirst(legsPerMember)
            : copy.legPicker.multiLegNext(legSlot - 1, legSlot)}
        </Text>
      ) : null}

      {!competitionId ? (
        <>
          <Text style={styles.stepLabel}>1. Competition</Text>
          {competitions.map((c) => (
            <OptionRow
              key={c.id}
              label={c.name}
              selected={false}
              onPress={() => {
                setCompetitionId(c.id);
                setFixtureId("");
                setMarketType("");
                setSelectionId("");
              }}
            />
          ))}
        </>
      ) : null}

      {competition ? (
        <View style={styles.selectedMarket}>
          <View style={styles.selectedMarketCopy}>
            <Text style={styles.selectedMarketEyebrow}>1. Selected competition</Text>
            <Text style={styles.selectedMarketLabel}>{competition.name}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change competition from ${competition.name}`}
            onPress={() => {
              setCompetitionId("");
              setFixtureId("");
              setMarketType("");
              setSelectionId("");
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.changeMarket}>Change competition</Text>
          </Pressable>
        </View>
      ) : null}

      {competitionId && loadingFixtures ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
      ) : null}

      {competitionId && !loadingFixtures && fixtures.length === 0 ? (
        <Text style={styles.meta}>{copy.legPicker.noFixturesLive}</Text>
      ) : null}

      {competitionId && !loadingFixtures && fixtures.length > 0 && !fixture ? (
        <>
          <Text style={styles.stepLabel}>2. Fixture</Text>
          {hasTakenFixtures ? (
            <Text style={styles.fixtureRule}>
              One pick per fixture keeps combined odds accurate.
            </Text>
          ) : null}
          {fixtures.map((f) => {
            const taken = isFixtureTaken(existingLegs, f.id, editLegId);
            const mixes = findOutrightMixConflict(existingLegs, f.id, editLegId) !== null;
            const disabled = taken || mixes;
            const suffix = taken ? " (already in acca)" : mixes ? " (not combinable)" : "";
            return (
              <OptionRow
                key={f.id}
                label={`${formatFixtureLabel(f)}${suffix}`}
                subtitle={
                  isOutrightFixtureId(f.id) ? "Settles at season end" : formatKickoff(f.kickoff)
                }
                selected={false}
                disabled={disabled}
                onPress={() => {
                  if (!disabled) {
                    setFixtureId(f.id);
                    setMarketType("");
                    setSelectionId("");
                  }
                }}
              />
            );
          })}
        </>
      ) : null}

      {fixture ? (
        <View style={styles.selectedMarket}>
          <View style={styles.selectedMarketCopy}>
            <Text style={styles.selectedMarketEyebrow}>2. Selected fixture</Text>
            <Text style={styles.selectedMarketLabel}>{formatFixtureLabel(fixture)}</Text>
            <Text style={styles.meta}>
              {isOutrightFixtureId(fixture.id)
                ? "Settles at the end of the season — this acca stays open until then"
                : formatKickoff(fixture.kickoff)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change fixture from ${formatFixtureLabel(fixture)}`}
            onPress={() => {
              setFixtureId("");
              setMarketType("");
              setSelectionId("");
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.changeMarket}>Change fixture</Text>
          </Pressable>
        </View>
      ) : null}

      {fixture && !market ? (
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
        <View style={styles.stack}>
          <View style={styles.selectedMarket}>
            <View style={styles.selectedMarketCopy}>
              <Text style={styles.selectedMarketEyebrow}>3. Selected market</Text>
              <Text style={styles.selectedMarketLabel}>{market.label}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change market from ${market.label}`}
              onPress={() => {
                setMarketType("");
                setSelectionId("");
              }}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.changeMarket}>Change market</Text>
            </Pressable>
          </View>
          <Text style={styles.stepLabel}>4. Selection</Text>
          {market.selections.map((s) => {
            const top = sortQuotesByBestOdds(s.odds)[0];
            return (
              <OptionRow
                key={s.id}
                label={s.label}
                subtitle={top ? `Best ${formatOdds(top.odds)}` : undefined}
                selected={selectionId === s.id}
                onPress={() => setSelectionId(s.id)}
              />
            );
          })}
        </View>
      ) : null}

      {selection ? (
        <View style={styles.stack}>
          <Text style={styles.meta}>{copy.legPicker.bestOddsHint}</Text>
          {sortQuotesForDisplay(selection.odds).length > 0 ? (
            <View style={styles.oddsCompareCard}>
              {sortQuotesForDisplay(selection.odds).map((q) => (
                <View key={q.bookmakerId} style={styles.oddsCompareRow}>
                  <Text style={styles.oddsCompareName}>{q.bookmakerName}</Text>
                  <View style={styles.oddsCompareValue}>
                    <Text style={styles.oddsCompareOdds}>{formatOdds(q.odds)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
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
        <Button label="Cancel. Keep my current pick" onPress={onCancel} variant="secondary" />
      ) : null}
    </Card>
  );
}

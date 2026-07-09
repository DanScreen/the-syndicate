import { ApiError, api, type GroupDetail } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import {
  Button,
  Card,
  ErrorText,
  OptionRow,
  Screen,
  Subtitle,
  Title,
} from "@/components/ui";
import { colors } from "@/config";
import type { Fixture } from "@the-syndicate/shared";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token || !id) return;
    const data = await api<GroupDetail>(`/api/groups/${id}`, { token });
    setDetail(data);
  }, [token, id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load group"))
      .finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function startRound() {
    if (!token || !id) return;
    setError("");
    try {
      await api(`/api/groups/${id}/rounds`, {
        method: "POST",
        token,
        body: JSON.stringify({ groupId: id }),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to start round");
    }
  }

  if (loading || !detail) {
    return (
      <Screen>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <ErrorText message={error || "Group not found"} />
        )}
      </Screen>
    );
  }

  const round = detail.activeRound;
  const myLeg = round?.legs.find((l) => l.user.id === user?.id);
  const canSubmit =
    round?.status === "collecting" && !myLeg && user?.id;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <Title>{detail.group.name}</Title>
      <Subtitle>
        {detail.group.memberCount} members · Code: {detail.group.inviteCode}
      </Subtitle>

      {detail.isOwner && !round && (
        <Button label="Start new round" onPress={startRound} />
      )}

      {round && (
        <Card>
          <Text style={styles.sectionTitle}>
            Active round · {round.status}
            {round.combinedOdds ? ` · ${round.combinedOdds.toFixed(2)} combined` : ""}
          </Text>
          {round.legs.length === 0 ? (
            <Text style={styles.meta}>Waiting for legs…</Text>
          ) : (
            round.legs.map((leg) => (
              <View key={leg.id} style={styles.leg}>
                <Text style={styles.legUser}>{leg.user.name}</Text>
                <Text style={styles.legPick}>
                  {leg.homeTeam} vs {leg.awayTeam}
                </Text>
                <Text style={styles.meta}>
                  {leg.marketLabel}: {leg.selectionLabel} @ {leg.odds} ({leg.bookmakerName})
                </Text>
              </View>
            ))
          )}
        </Card>
      )}

      {canSubmit && round && token && user && (
        <SubmitLegForm roundId={round.id} token={token} onSubmitted={load} />
      )}

      {detail.isOwner && round?.status === "settled" && (
        <Button label="Start next round" onPress={startRound} variant="secondary" />
      )}

      {detail.betslipLink && (
        <Button
          label="Open betslip"
          onPress={() => Linking.openURL(detail.betslipLink!)}
        />
      )}

      <Text style={styles.sectionTitle}>Leaderboard</Text>
      {detail.leaderboard.map((entry, i) => (
        <Card key={entry.userId}>
          <Text style={styles.leaderRow}>
            #{i + 1} {entry.name}
            {entry.role === "owner" ? " (owner)" : ""} — {entry.points} pts
          </Text>
          <Text style={styles.meta}>
            {entry.legsWon}W / {entry.legsLost}L
          </Text>
        </Card>
      ))}

      <ErrorText message={error} />
    </ScrollView>
  );
}

function SubmitLegForm({
  roundId,
  token,
  onSubmitted,
}: {
  roundId: string;
  token: string;
  onSubmitted: () => void;
}) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixtureId, setFixtureId] = useState("");
  const [marketType, setMarketType] = useState("");
  const [selectionId, setSelectionId] = useState("");
  const [bookmakerId, setBookmakerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ fixtures: Fixture[] }>("/api/fixtures", { token })
      .then((d) => setFixtures(d.fixtures))
      .catch(() => setFixtures([]));
  }, [token]);

  const fixture = fixtures.find((f) => f.id === fixtureId);
  const market = fixture?.markets.find((m) => m.type === marketType);
  const selection = market?.selections.find((s) => s.id === selectionId);

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await api("/api/legs", {
        method: "POST",
        token,
        body: JSON.stringify({
          roundId,
          fixtureId,
          marketType,
          selectionId,
          bookmakerId,
        }),
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to submit leg");
    } finally {
      setLoading(false);
    }
  }

  const ready = fixtureId && marketType && selectionId && bookmakerId;

  return (
    <Card>
      <Text style={styles.sectionTitle}>Submit your leg</Text>

      <Text style={styles.label}>Fixture</Text>
      {fixtures.map((f) => (
        <OptionRow
          key={f.id}
          label={`${f.homeTeam} vs ${f.awayTeam}`}
          selected={fixtureId === f.id}
          onPress={() => {
            setFixtureId(f.id);
            setMarketType("");
            setSelectionId("");
            setBookmakerId("");
          }}
        />
      ))}

      {fixture && (
        <>
          <Text style={styles.label}>Market</Text>
          {fixture.markets.map((m) => (
            <OptionRow
              key={m.type}
              label={m.label}
              selected={marketType === m.type}
              onPress={() => {
                setMarketType(m.type);
                setSelectionId("");
                setBookmakerId("");
              }}
            />
          ))}
        </>
      )}

      {market && (
        <>
          <Text style={styles.label}>Selection</Text>
          {market.selections.map((s) => (
            <OptionRow
              key={s.id}
              label={s.label}
              selected={selectionId === s.id}
              onPress={() => {
                setSelectionId(s.id);
                setBookmakerId("");
              }}
            />
          ))}
        </>
      )}

      {selection && (
        <>
          <Text style={styles.label}>Bookmaker</Text>
          {selection.odds.map((o) => (
            <OptionRow
              key={o.bookmakerId}
              label={`${o.bookmakerName} @ ${o.odds}`}
              selected={bookmakerId === o.bookmakerId}
              onPress={() => setBookmakerId(o.bookmakerId)}
            />
          ))}
        </>
      )}

      <ErrorText message={error} />
      <Button
        label="Submit leg"
        onPress={() => {
          if (ready) handleSubmit();
        }}
        loading={loading}
        variant={ready ? "primary" : "secondary"}
      />
    </Card>
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
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  leg: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legUser: {
    color: colors.text,
    fontWeight: "600",
  },
  legPick: {
    color: colors.text,
    marginTop: 2,
  },
  leaderRow: {
    color: colors.text,
    fontWeight: "500",
  },
});

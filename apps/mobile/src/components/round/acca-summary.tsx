import { useState } from "react";
import {
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  BOOKMAKER_RANKINGS_PREVIEW_COUNT,
  accaSummaryCopy,
  bookmakerRankPlace,
  formatOdds,
} from "@tiki-acca/shared";
import type { AccaBookmakerRanking } from "@tiki-acca/shared";
import { BetslipDisclosure } from "@/components/compliance";
import { Button, Card } from "@/components/ui";
import { colors } from "@/config";
import { BookmakerLogo } from "./bookmaker-logo";
import { styles } from "./styles";

export function AccaSummary({
  combinedOdds,
  bookmakerName,
  bookmakerId,
  singleBookmaker,
  bookmakerRankings = [],
  betslipLink,
  betslipLinkQuality = null,
  betslipHasAllLegLinks = false,
  legCount = 1,
  inProgress = false,
  preview = false,
  showBookmakerCompare = true,
  compareDefaultOpen = true,
}: {
  combinedOdds: number;
  bookmakerName?: string | null;
  bookmakerId?: string | null;
  singleBookmaker: boolean;
  bookmakerRankings?: AccaBookmakerRanking[];
  betslipLink?: string | null;
  betslipLinkQuality?: "deeplink" | "hub" | null;
  betslipHasAllLegLinks?: boolean;
  legCount?: number;
  /** Locked acca — frozen odds copy; outcomes may be in progress. */
  inProgress?: boolean;
  /** Open round — live current odds from legs so far. */
  preview?: boolean;
  showBookmakerCompare?: boolean;
  /** Initial expanded/collapsed state of the compare list (collapse once the bet is underway). */
  compareDefaultOpen?: boolean;
}) {
  const [bookmakersOpen, setBookmakersOpen] = useState(compareDefaultOpen);
  const [expandedBookmakerRankingKey, setExpandedBookmakerRankingKey] = useState<
    string | null
  >(null);
  const topBookmaker = bookmakerRankings[0];
  const showCompare = showBookmakerCompare && bookmakerRankings.length > 0;
  const bookmakerRankingKey = bookmakerRankings
    .map((entry) => entry.bookmakerId)
    .join(",");
  const showAllBookmakers =
    expandedBookmakerRankingKey === bookmakerRankingKey;
  const canExpandBookmakers =
    bookmakerRankings.length > BOOKMAKER_RANKINGS_PREVIEW_COUNT;
  const visibleBookmakerRankings = showAllBookmakers
    ? bookmakerRankings
    : bookmakerRankings.slice(0, BOOKMAKER_RANKINGS_PREVIEW_COUNT);
  const labels = accaSummaryCopy({
    inProgress,
    preview,
    bookmakerName,
    topBookmakerName: topBookmaker?.bookmakerName,
    linkQuality:
      betslipLinkQuality ??
      topBookmaker?.linkQuality ??
      (topBookmaker?.url ? "deeplink" : null),
    legCount,
    hasAllLegLinks: betslipHasAllLegLinks,
    singleBookmaker,
  });

  return (
    <View style={styles.stack}>
      <View style={styles.accaCard}>
        <View style={styles.accaMain}>
          <Text style={styles.accaLabel}>{labels.oddsLabel}</Text>
          <Text style={styles.accaOdds}>{formatOdds(combinedOdds)}</Text>
          {singleBookmaker && bookmakerName ? (
            <View style={styles.lockedAtRow}>
              {bookmakerId ? (
                <BookmakerLogo bookmakerId={bookmakerId} name={bookmakerName} size={18} />
              ) : null}
              <Text style={styles.meta}>{labels.bookmakerLine}</Text>
            </View>
          ) : null}
          {labels.previewNote ? <Text style={styles.meta}>{labels.previewNote}</Text> : null}
          {labels.multiBookmakerNote ? (
            <Text style={styles.warnText}>{labels.multiBookmakerNote}</Text>
          ) : null}
        </View>
        {betslipLink ? (
          <>
            <Button label={labels.ctaLabel} onPress={() => Linking.openURL(betslipLink)} />
            {labels.ctaHint ? <Text style={styles.meta}>{labels.ctaHint}</Text> : null}
            <BetslipDisclosure />
          </>
        ) : null}
      </View>

      {showCompare ? (
        <Card>
          <Pressable
            onPress={() => setBookmakersOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: bookmakersOpen }}
            style={({ pressed }) => [styles.compareHeader, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.sectionTitle}>
              Compare bookmakers ({bookmakerRankings.length})
            </Text>
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              style={{ transform: [{ rotate: bookmakersOpen ? "180deg" : "0deg" }] }}
            >
              <Path
                d="m6 9 6 6 6-6"
                stroke={colors.muted}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          {bookmakersOpen ? (
            <>
              {visibleBookmakerRankings.map((entry, index) => {
                const place = bookmakerRankPlace(index);
                const logoSize = place === 1 ? 32 : place === "other" ? 24 : 28;
                const qualityHint =
                  entry.linkQuality === "hub"
                    ? "Football hub"
                    : entry.hasAllLegLinks === false && entry.url
                      ? "First pick only"
                      : null;
                return (
                  <View
                    key={entry.bookmakerId}
                    style={[
                      styles.rankRow,
                      place === 1 && styles.rankRow1,
                      place === 2 && styles.rankRow2,
                      place === 3 && styles.rankRow3,
                    ]}
                  >
                    <View style={styles.rankLeft}>
                      <View
                        style={[
                          styles.rankBadge,
                          place === 1 && styles.rankBadge1,
                          place === 2 && styles.rankBadge2,
                          place === 3 && styles.rankBadge3,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankBadgeText,
                            place === 1 && styles.rankBadgeTextDark,
                            place === 2 && styles.rankBadgeTextDark,
                            place === 3 && styles.rankBadgeTextDark,
                          ]}
                        >
                          {place === 1 ? "Best" : `#${index + 1}`}
                        </Text>
                      </View>
                      <BookmakerLogo
                        bookmakerId={entry.bookmakerId}
                        name={entry.bookmakerName}
                        size={logoSize}
                      />
                      <View style={styles.rankNameCol}>
                        <Text
                          style={[
                            styles.rankName,
                            place === 1 && styles.rankName1,
                            (place === 2 || place === 3) && styles.rankNamePodium,
                          ]}
                          numberOfLines={1}
                        >
                          {entry.bookmakerName}
                        </Text>
                        {qualityHint ? (
                          <Text style={styles.warnText}>{qualityHint}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.rankRight}>
                      <Text
                        style={[
                          styles.meta,
                          place === 1 && styles.rankOdds1,
                          (place === 2 || place === 3) && styles.rankOddsPodium,
                        ]}
                      >
                        {formatOdds(entry.combinedOdds)}
                      </Text>
                      {entry.url ? (
                        <Pressable onPress={() => Linking.openURL(entry.url!)}>
                          <Text style={styles.openLinkText}>Open</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
              {canExpandBookmakers ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showAllBookmakers }}
                  onPress={() =>
                    setExpandedBookmakerRankingKey((key) =>
                      key === bookmakerRankingKey ? null : bookmakerRankingKey,
                    )
                  }
                  style={({ pressed }) => [
                    styles.showBookmakersButton,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.showBookmakersText}>
                    {showAllBookmakers
                      ? `Show top ${BOOKMAKER_RANKINGS_PREVIEW_COUNT}`
                      : `Show all ${bookmakerRankings.length} bookmakers`}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

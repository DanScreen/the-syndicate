import { findSelection } from "@/lib/odds/provider";
import { findBestAccaBookmaker, quoteForBookmaker, rankAccaBookmakers } from "@/lib/odds/acca";
import { buildRoundBetslipLinks, isBookmakerHubUrl } from "@/lib/odds/betslip-links";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { bookmakerLinksFromQuotes } from "@/lib/odds/quotes";
import { prisma } from "@the-syndicate/database";
import type { AccaBookmakerRanking } from "@the-syndicate/shared";
import type { Leg } from "@prisma/client";

export async function lockRoundWithAccaPricing(roundId: string, legs: Leg[]) {
  const legQuotes = await Promise.all(
    legs.map(async (leg) => {
      const selection = await findSelection(
        leg.fixtureId,
        leg.marketType,
        leg.selectionId,
        leg.competitionId
      );
      return {
        leg,
        quotes: selection?.selection.odds ?? [],
      };
    })
  );

  const quoteLegs = legQuotes.map((l) => ({ quotes: l.quotes }));
  const acca = findBestAccaBookmaker(quoteLegs);
  const rankings = rankAccaBookmakers(quoteLegs);

  if (!acca) {
    throw new Error("Unable to price acca");
  }

  for (const { leg, quotes } of legQuotes) {
    const bookmakerLinks = bookmakerLinksFromQuotes(quotes);
    const quote = acca.singleBookmaker
      ? quoteForBookmaker(quotes, acca.bookmakerId)
      : sortQuotesByBestOdds(quotes)[0];

    if (quote) {
      await prisma.leg.update({
        where: { id: leg.id },
        data: {
          odds: quote.odds,
          bookmakerId: quote.bookmakerId,
          bookmakerName: quote.bookmakerName,
          betslipUrl:
            (quote.link && !isBookmakerHubUrl(quote.link) ? quote.link : null) ??
            bookmakerLinks[quote.bookmakerId] ??
            null,
          bookmakerLinks,
        },
      });
    }
  }

  const updatedLegs = await prisma.leg.findMany({
    where: { roundId, id: { in: legs.map((l) => l.id) } },
    include: { user: { select: { name: true } } },
  });

  const betslip = buildRoundBetslipLinks(
    updatedLegs,
    rankings,
    acca.singleBookmaker ? acca.bookmakerId : null
  );

  const rankingsWithUrls = betslip.rankedLinks.map((r) => ({
    bookmakerId: r.bookmakerId,
    bookmakerName: r.bookmakerName,
    combinedOdds: r.combinedOdds,
    url: r.url,
    hasAllLegLinks: r.hasAllLegLinks,
    linkQuality: r.linkQuality,
  }));

  // Conditional write: only price a round that is still locked (or being
  // locked). Guards against a concurrent settlement flipping the round to
  // "settled" mid-reprice — we must never resurrect a settled round.
  const updated = await prisma.round.updateMany({
    where: { id: roundId, status: "locked" },
    data: {
      status: "locked",
      combinedOdds: acca.combinedOdds,
      bestBookmakerId: acca.singleBookmaker ? acca.bookmakerId : null,
      accaBookmakerRankings: rankingsWithUrls,
      lockedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    throw new Error("Round is no longer locked — acca pricing not applied");
  }
}

export type AccaRankingsResult = {
  rankings: AccaBookmakerRanking[];
  /** Fresh Odds API deeplinks keyed by leg id (hubs excluded). */
  bookmakerLinksByLegId: Record<string, Record<string, string>>;
};

export async function computeAccaRankingsForLegs(legs: Leg[]): Promise<AccaRankingsResult> {
  const legQuotes = await Promise.all(
    legs.map(async (leg) => {
      const selection = await findSelection(
        leg.fixtureId,
        leg.marketType,
        leg.selectionId,
        leg.competitionId
      );
      const quotes = selection?.selection.odds ?? [];
      return {
        legId: leg.id,
        quotes,
        bookmakerLinks: bookmakerLinksFromQuotes(quotes),
      };
    })
  );

  const bookmakerLinksByLegId = Object.fromEntries(
    legQuotes.map((lq) => [lq.legId, lq.bookmakerLinks])
  );

  const quoteLegs = legQuotes.map((lq) => ({ quotes: lq.quotes }));
  const ranked = rankAccaBookmakers(quoteLegs);
  if (ranked.length > 0) {
    return {
      rankings: ranked.map((r) => ({
        bookmakerId: r.bookmakerId,
        bookmakerName: r.bookmakerName,
        combinedOdds: r.combinedOdds,
      })),
      bookmakerLinksByLegId,
    };
  }

  // Fallback when no single bookmaker quotes every leg: best-per-leg combined.
  const best = findBestAccaBookmaker(quoteLegs);
  if (!best) {
    return { rankings: [], bookmakerLinksByLegId };
  }
  return {
    rankings: [
      {
        bookmakerId: best.bookmakerId,
        bookmakerName: best.bookmakerName,
        combinedOdds: best.combinedOdds,
      },
    ],
    bookmakerLinksByLegId,
  };
}

/** Merge stored + live bookmaker links (live wins; hubs already filtered). */
export function mergeLegBookmakerLinks<
  T extends {
    id: string;
    bookmakerLinks?: unknown;
    betslipUrl?: string | null;
    selectionLabel: string;
    homeTeam: string;
    awayTeam: string;
    user: { name: string };
  },
>(legs: T[], bookmakerLinksByLegId: Record<string, Record<string, string>>) {
  return legs.map((leg) => {
    const stored =
      leg.bookmakerLinks && typeof leg.bookmakerLinks === "object"
        ? (leg.bookmakerLinks as Record<string, string>)
        : {};
    const live = bookmakerLinksByLegId[leg.id] ?? {};
    return {
      ...leg,
      bookmakerLinks: { ...stored, ...live },
    };
  });
}


import { findSelection } from "@/lib/odds/provider";
import { findBestAccaBookmaker, quoteForBookmaker, rankAccaBookmakers } from "@/lib/odds/acca";
import { buildRoundBetslipLinks, isBookmakerHubUrl } from "@/lib/odds/betslip-links";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { bookmakerLinksFromQuotes } from "@/lib/odds/quotes";
import { prisma } from "@tiki-acca/database";
import type { AccaBookmakerRanking, BookmakerQuote } from "@tiki-acca/shared";
import type { Leg } from "@prisma/client";

/** Quotes from the leg row when live odds are gone (e.g. fixture already kicked off). */
function quotesFromStoredLeg(leg: Leg): BookmakerQuote[] {
  if (!leg.bookmakerId || !(leg.odds > 0)) return [];
  return [
    {
      bookmakerId: leg.bookmakerId,
      bookmakerName: leg.bookmakerName,
      odds: leg.odds,
      link: leg.betslipUrl ?? undefined,
    },
  ];
}

function storedBookmakerLinks(leg: Leg): Record<string, string> {
  if (leg.bookmakerLinks && typeof leg.bookmakerLinks === "object") {
    return leg.bookmakerLinks as Record<string, string>;
  }
  return {};
}

export async function lockRoundWithAccaPricing(roundId: string, legs: Leg[]) {
  const legQuotes = await Promise.all(
    legs.map(async (leg) => {
      let liveQuotes: BookmakerQuote[] = [];
      try {
        const selection = await findSelection(
          leg.fixtureId,
          leg.marketType,
          leg.selectionId,
          leg.competitionId
        );
        liveQuotes = selection?.selection.odds ?? [];
      } catch (err) {
        console.warn("[lock] live quote lookup failed; using stored odds", leg.id, err);
      }

      const usedStored = liveQuotes.length === 0;
      const quotes = usedStored ? quotesFromStoredLeg(leg) : liveQuotes;
      if (usedStored) {
        console.info(
          `[lock] using stored odds for leg=${leg.id} fixture=${leg.fixtureId} market=${leg.marketType}`
        );
      }

      return { leg, quotes, usedStored };
    })
  );

  const quoteLegs = legQuotes.map((l) => ({ quotes: l.quotes }));
  const acca = findBestAccaBookmaker(quoteLegs);
  const rankings = rankAccaBookmakers(quoteLegs);

  if (!acca) {
    throw new Error("Unable to price acca");
  }

  for (const { leg, quotes, usedStored } of legQuotes) {
    const liveLinks = bookmakerLinksFromQuotes(quotes);
    const bookmakerLinks =
      Object.keys(liveLinks).length > 0 ? liveLinks : storedBookmakerLinks(leg);
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
            leg.betslipUrl ??
            null,
          // Keep existing links when we only have stored single-bookmaker quotes.
          ...(Object.keys(bookmakerLinks).length > 0
            ? { bookmakerLinks }
            : usedStored
              ? {}
              : { bookmakerLinks: {} }),
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
      let quotes: BookmakerQuote[] = [];
      try {
        const selection = await findSelection(
          leg.fixtureId,
          leg.marketType,
          leg.selectionId,
          leg.competitionId
        );
        quotes = selection?.selection.odds ?? [];
      } catch {
        quotes = [];
      }
      if (quotes.length === 0) {
        quotes = quotesFromStoredLeg(leg);
      }
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


import { findSelection } from "@/lib/odds/provider";
import { findBestAccaBookmaker, quoteForBookmaker } from "@/lib/odds/acca";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { prisma } from "@the-syndicate/database";
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

  const acca = findBestAccaBookmaker(legQuotes.map((l) => ({ quotes: l.quotes })));

  if (!acca) {
    throw new Error("Unable to price acca");
  }

  for (const { leg, quotes } of legQuotes) {
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
        },
      });
    }
  }

  await prisma.round.update({
    where: { id: roundId },
    data: {
      status: "locked",
      combinedOdds: acca.combinedOdds,
      bestBookmakerId: acca.singleBookmaker ? acca.bookmakerId : null,
      lockedAt: new Date(),
    },
  });
}

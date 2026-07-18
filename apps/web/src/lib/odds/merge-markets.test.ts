import assert from "node:assert/strict";
import test from "node:test";
import type { Market } from "@tiki-acca/shared";
import { mergeMarketCollections } from "./merge-markets";

test("combines bookmaker coverage for the same market and selection", () => {
  const featured: Market[] = [
    {
      type: "over_under_25",
      label: "Over/Under 2.5 Goals",
      selections: [
        {
          id: "over",
          label: "Over 2.5",
          odds: [
            {
              bookmakerId: "williamhill",
              bookmakerName: "William Hill",
              odds: 1.44,
              link: "https://featured.example/over-25",
            },
          ],
        },
      ],
    },
  ];
  const alternate: Market[] = [
    {
      type: "over_under_25",
      label: "Over/Under Goals O/U 2.5",
      selections: [
        {
          id: "over",
          label: "Over 2.5",
          odds: [
            {
              bookmakerId: "williamhill",
              bookmakerName: "William Hill",
              odds: 1.45,
            },
            {
              bookmakerId: "coral",
              bookmakerName: "Coral",
              odds: 1.44,
              link: "https://alternate.example/coral/over-25",
            },
          ],
        },
      ],
    },
  ];

  const merged = mergeMarketCollections(featured, alternate);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.label, "Over/Under 2.5 Goals");
  assert.deepEqual(
    merged[0]?.selections[0]?.odds.map((quote) => quote.bookmakerId),
    ["williamhill", "coral"]
  );
  assert.deepEqual(merged[0]?.selections[0]?.odds[0], {
    bookmakerId: "williamhill",
    bookmakerName: "William Hill",
    odds: 1.45,
    link: "https://featured.example/over-25",
  });
});

test("preserves markets and selections that exist in only one feed", () => {
  const featured: Market[] = [
    {
      type: "match_winner",
      label: "Match Winner",
      selections: [
        {
          id: "home",
          label: "France",
          odds: [
            {
              bookmakerId: "coral",
              bookmakerName: "Coral",
              odds: 1.85,
            },
          ],
        },
      ],
    },
  ];
  const alternate: Market[] = [
    {
      type: "both_teams_score",
      label: "Both Teams to Score",
      selections: [
        {
          id: "yes",
          label: "Yes",
          odds: [
            {
              bookmakerId: "coral",
              bookmakerName: "Coral",
              odds: 1.8,
            },
          ],
        },
      ],
    },
  ];

  const merged = mergeMarketCollections(featured, alternate);

  assert.deepEqual(
    merged.map((market) => market.type),
    ["match_winner", "both_teams_score"]
  );
});

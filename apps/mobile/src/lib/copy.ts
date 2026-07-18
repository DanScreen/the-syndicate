/** User-facing copy. Align with web where noted. */
export const copy = {
  dashboard: {
    emptyTitle: "No groups yet.",
    emptyBody: "Create a group for your mates or join with an invite code.",
  },
  join: {
    title: "Join A Group",
    subtitle:
      "Enter the invite code shared by your group owner, or open their invite link directly.",
    placeholder: "ABCD1234",
  },
  group: {
    notFound: "Group not found or you are not a member.",
    loadFailed: "Failed to load group",
  },
  legPicker: {
    loadingCompetitions: "Loading competitions…",
    noCompetitions:
      "No competitions are available for picks right now. Check back soon.",
    loadingFixtures: "Loading fixtures…",
    noFixturesLive:
      "No upcoming fixtures with bookmaker odds right now. Try again closer to kickoff.",
    noFixturesMock: "No demo fixtures available.",
    loadingMarkets: "Loading popular markets…",
    marketsError: "Failed to load markets",
    bestOddsHint:
      "You'll submit at the best available odds. The group acca bookmaker is chosen when all legs are in.",
  },
  stats: {
    noGroupRounds:
      "No settled rounds yet. Stats appear after your first round is settled.",
    noUserLegs: "No settled legs yet. Stats appear after your first round settles.",
    loadFailed: "Failed to load stats",
  },
  compliance: {
    betslip:
      "You place bets directly with licensed bookmakers. Tiki Acca does not take bets or handle money. 18+ only.",
    footerTitle: "Gamble responsibly",
    footerBody:
      "Tiki Acca helps groups coordinate accumulator ideas. We do not take bets or handle money. You place bets directly with licensed bookmakers.",
    helpline: "Need support? Visit BeGambleAware.org or call 0808 8020 133.",
    begambleawareUrl: "https://www.begambleaware.org",
  },
} as const;

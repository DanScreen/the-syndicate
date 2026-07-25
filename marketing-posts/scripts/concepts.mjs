/**
 * Shared marketing concept manifest.
 *
 * `file` is the output filename (without extension).
 * `source` is the raw screenshot filename (without extension).
 * `layout: "panel"` keeps a wide UI section fully visible instead of cropping it
 * into the standard phone-shaped frame.
 */
export const shots = [
  {
    file: "01-dashboard-hero-locked-acca",
    source: "01-dashboard-hero-locked-acca",
    h: "Your mates. One acca. Every leg counts.",
    s: "Each member picks one leg — best odds locked in for you.",
    screen: "Dashboard · locked acca",
    kind: "core",
  },
  {
    file: "04a-banter-with-receipts",
    source: "04a-group-chat",
    h: "Banter, with receipts.",
    s: "React to every pick — and remember who called it.",
    screen: "Group chat",
    kind: "core",
    layout: "chat",
  },
  {
    file: "05b-performance-chart",
    source: "05b-performance-chart",
    h: "See who consistently delivers.",
    s: "Every pick tracked. Every run of form revealed.",
    screen: "Performance · member chart",
    kind: "core",
    layout: "chart",
  },
  {
    file: "07-best-acca-odds",
    source: "07-best-acca-odds",
    h: "The best price for your acca.",
    s: "We compare the combined odds — you choose where to place it.",
    screen: "Round · bookmaker comparison",
    kind: "core",
    layout: "panel",
  },
  {
    file: "03b-leaderboard-full",
    source: "03b-leaderboard-full",
    h: "Who's actually good?",
    s: "A group leaderboard with a long memory.",
    screen: "Leaderboard",
    kind: "core",
  },
  {
    file: "03a-leaderboard-top",
    source: "03a-leaderboard-top",
    h: "Top of the table. For now.",
    s: "Points from every settled leg — no hiding place.",
    screen: "Leaderboard · top 3",
    kind: "alt",
  },
  {
    file: "04b-history-winning-legs",
    source: "04b-history-winning-legs",
    h: "Real picks. Real odds. Real results.",
    s: "Every leg settled against the actual match.",
    screen: "History · winning legs",
    kind: "alt",
  },
  {
    file: "05a-performance-stats",
    source: "05a-performance-stats",
    h: "The numbers don't lie.",
    s: "Win rate, net points and form at a glance.",
    screen: "Performance · stat tiles",
    kind: "alt",
  },
];

export const tagline = "Social group accas";

export const hero = {
  headline: "Your mates. One acca. Every leg counts.",
  subhead:
    "The Syndicate is where football groups build shared accumulators together — each member picks one leg, you lock in the best combined odds, and compete on who lands the most winners.",
};

export const valueProps = [
  {
    title: "Built for friend groups",
    body: "Pub syndicates, WhatsApp groups, five-a-side teams — create a private group, share an invite link, and everyone contributes one selection.",
    icon: "users",
  },
  {
    title: "Best odds, compared",
    body: "We pull live prices from UK bookmakers, show the best odds per leg, and rank who offers the strongest combined acca when you lock.",
    icon: "chart",
  },
  {
    title: "Track who’s actually good",
    body: "Leaderboards, performance charts, and leg-by-leg stats — see who consistently finds winners and how your syndicate performs over time.",
    icon: "trophy",
  },
  {
    title: "You place the bets",
    body: "We coordinate picks and link you to bookmaker betslips. We never take money or place bets on your behalf.",
    icon: "shield",
  },
] as const;

export const howItWorks = [
  {
    step: "01",
    title: "Start a syndicate",
    body: "Create a group and drop the invite link in your group chat.",
  },
  {
    step: "02",
    title: "Everyone picks a leg",
    body: "Each member chooses a competition, fixture, market, and selection from live odds.",
  },
  {
    step: "03",
    title: "Lock and compete",
    body: "When all legs are in, the acca locks. Track results, earn points, and climb the leaderboard.",
  },
] as const;

export const audiences = [
  {
    title: "Pub syndicates",
    body: "Replace the Saturday spreadsheet with a shared acca everyone can see and contribute to.",
  },
  {
    title: "Mate groups",
    body: "Stop arguing about whose pick lost the acca — the stats settle it.",
  },
  {
    title: "Office leagues",
    body: "Small groups, one leg each, bragging rights on the line every matchday.",
  },
] as const;

export const faqs = [
  {
    q: "Is The Syndicate a bookmaker?",
    a: "No. We help groups coordinate accumulator picks and compare odds. You place bets directly with licensed UK bookmakers via their own sites.",
  },
  {
    q: "How does scoring work?",
    a: "Each leg earns unit-stake points: wins score odds minus one, losses cost one point, voids score zero. Leaderboards rank members over time.",
  },
  {
    q: "Can we mix competitions?",
    a: "Yes. Each member picks their own competition — Premier League, Championship, World Cup, and more — in the same acca.",
  },
  {
    q: "Is it free?",
    a: "Yes. Create groups, submit legs, and track performance at no cost.",
  },
] as const;

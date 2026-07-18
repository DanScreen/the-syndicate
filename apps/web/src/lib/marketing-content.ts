import { BRAND_HEADLINE, BRAND_TAGLINE } from "@tiki-acca/shared";

export const tagline = BRAND_TAGLINE;

export const hero = {
  headline: BRAND_HEADLINE,
  subhead:
    "Tiki-taka is football's great passing game: everyone touches the ball. In a group acca, everyone touches the bet. Each member picks one leg and Tiki Acca handles the rest: locking in the best odds from UK bookmakers, tracking every result, and keeping score of who consistently delivers, and who lets the acca down. It's free for your whole group.",
};

export const valueProps = [
  {
    title: "Built For Friend Groups",
    body: "Pub groups, WhatsApp groups, five-a-side teams. Create a private group, share an invite link, and everyone contributes one selection.",
    icon: "users",
  },
  {
    title: "Track Who’s Actually Good",
    body: "Leaderboards, performance charts, and leg-by-leg stats. See who consistently finds winners and how your group performs over time.",
    icon: "trophy",
  },
  {
    title: "Best Odds, Done For You",
    body: "We pull live prices from UK bookmakers, pick out the best odds per leg, and rank who offers the strongest combined acca when you lock.",
    icon: "chart",
  },
  {
    title: "You Place The Bets",
    body: "We coordinate picks and link you to bookmaker betslips. We never take money or place bets on your behalf.",
    icon: "shield",
  },
] as const;

export const howItWorks = [
  {
    step: "01",
    title: "Start A Group",
    body: "Create a group and drop the invite link in your group chat.",
  },
  {
    step: "02",
    title: "Everyone Picks A Leg",
    body: "Each member chooses a competition, fixture, market, and selection from live odds.",
  },
  {
    step: "03",
    title: "Lock And Compete",
    body: "When all legs are in, the acca locks at the best combined odds. Then everyone sweats together.",
  },
] as const;

export const audiences = [
  {
    title: "Pub Groups",
    body: "Replace the Saturday spreadsheet with a shared acca everyone can see and contribute to.",
  },
  {
    title: "Friend Groups",
    body: "Stop arguing about whose pick lost the acca. The stats settle it.",
  },
  {
    title: "Office Leagues",
    body: "Small groups, one leg each, bragging rights on the line every matchday.",
  },
] as const;

export const faqs = [
  {
    q: "Is Tiki Acca a bookmaker?",
    a: "No. We help groups coordinate accumulator picks and compare odds. You place bets directly with licensed UK bookmakers via their own sites.",
  },
  {
    q: "How does scoring work?",
    a: "Each member stakes one unit on the group acca. A winning acca scores combined odds minus one for the group; each member gets odds minus one on their own leg. A losing acca costs one point each. Leaderboards rank members over time.",
  },
  {
    q: "Can we mix competitions?",
    a: "Yes. Each member picks their own competition (Premier League, Championship, World Cup, and more) in the same acca.",
  },
  {
    q: "Why can we only pick one leg per fixture?",
    a: "Outcomes from the same match can affect each other, so simply multiplying their odds would produce an inaccurate price. Bookmakers account for this through bet-builder pricing, which our odds feed does not provide. Limiting each acca to one leg per fixture keeps the displayed odds accurate and fair.",
  },
  {
    q: "Is it free?",
    a: "Yes. Create groups, submit legs, and track performance at no cost.",
  },
  {
    q: "Do we have to bet real money?",
    a: "No. Plenty of groups play for points and pride alone. The leaderboard works exactly the same whether or not anyone places a bet.",
  },
] as const;

import { BRAND_HEADLINE, BRAND_TAGLINE } from "@tiki-acca/shared";

export const tagline = BRAND_TAGLINE;

/** Sign-up destination shared by the hero, pick-your-leg and the mobile sticky CTA. */
export const signUpHref = "/sign-up";

export const hero = {
  headline: BRAND_HEADLINE,
  subhead: "Everyone picks one leg. We find the best odds, keep score, and settle the arguments.",
  compliance: "18+ · Not a bookmaker · Tiki Acca never takes bets or holds money",
};

/**
 * Example group used by the homepage demos. All odds are illustrative
 * ("Example") and are never shown as live prices.
 */
export const exampleMates = [
  { name: "Danny", color: "#a78bfa", selection: "Man City to win", fixture: "Man City vs Brentford", odds: 1.4 },
  { name: "Sarah", color: "#f472b6", selection: "Both teams to score", fixture: "Newcastle vs Villa", odds: 1.65 },
  { name: "Matty", color: "#fb923c", selection: "Over 2.5 goals", fixture: "Spurs vs Brighton", odds: 1.55 },
  { name: "Priya", color: "#2dd4bf", selection: "Arsenal to win", fixture: "Arsenal vs Fulham", odds: 1.72 },
  { name: "Tom", color: "#818cf8", selection: "Liverpool to win", fixture: "Liverpool vs Palace", odds: 1.45 },
] as const;

/** Selections the visitor can tap in the "Pick your leg" demo. */
export const pickOptions = [
  { id: "arsenal", label: "Arsenal to win", odds: 1.72 },
  { id: "over", label: "Over 2.5 goals in Chelsea vs West Ham", odds: 1.6 },
  { id: "btts", label: "Both teams to score in Everton vs Wolves", odds: 1.8 },
] as const;

export const scrollStory = [
  {
    step: "01",
    title: "Everyone picks a leg",
    body: "One pick each. No passengers. The acca fills up as your mates commit.",
  },
  {
    step: "02",
    title: "Locked at the best odds",
    body: "When the last leg lands in the slip, we compare bookmakers and show where your acca pays best. You place the bet yourself, with them.",
  },
  {
    step: "03",
    title: "Find out who’s carrying",
    body: "Points for every leg that lands. A leaderboard that never forgets who let the acca down.",
  },
] as const;

export const banterLines = [
  "If your leg dies first you’re not living it down till Christmas.",
  "Three weeks top of the leaderboard. I accept payment in pints.",
  "Who picked a 0-0 specialist to score first?",
  "Locked. No changing it now, Matty.",
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

/** Multiplies decimal odds and formats to two places, e.g. [1.4, 1.65] -> "2.31". */
export function productOdds(odds: readonly number[]): string {
  return odds.reduce((acc, value) => acc * value, 1).toFixed(2);
}

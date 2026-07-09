# The Syndicate — Product Spec

## One-sentence pitch

The Syndicate lets football betting fans form social groups where each member contributes one leg to a shared accumulator, track group and individual performance, and compete while collaborating.

## Target users

- Recreational sports bettors, starting with **football fans**
- Friend groups, pub syndicates, or online communities who already share acca ideas
- Future expansion: other sports (horse racing, tennis, etc.)

## Core user flows

### Flow 1: Onboarding
1. User signs up with email and password
2. User lands on dashboard showing their groups and stats

### Flow 2: Create a group
1. User creates a group with name and settings (sport: football, max members)
2. System generates invite code and shareable link
3. Owner manages group from group detail page

### Flow 3: Join a group
1. User enters invite code or opens invite link
2. User joins as a member (pending acca if one is in progress)

### Flow 4: Build the group acca
1. Group owner opens a new round
2. Each member **chooses a competition** (e.g. Premier League, World Cup), then browses fixtures for that competition
3. Site shows markets with **best odds only** per selection
4. Member submits their leg
5. When all members have submitted, acca **locks** — system compares bookmakers across all legs and recommends the best combined acca price
6. Group sees locked acca with total odds and recommended bookmaker

> Competition picker + shared results: [COMPETITIONS_AND_RESULTS.md](./COMPETITIONS_AND_RESULTS.md).

### Flow 5: Place and track
1. Group sees locked acca with total odds and recommended bookmaker
2. Site generates deep link to auto-populated betslip at chosen bookmaker
3. Members track leg status as events conclude

### Flow 6: Settlement and leaderboard
1. System resolves each leg (won / lost / void)
2. Points assigned per member based on their leg outcome
3. Group profit/loss calculated (theoretical stake model)
4. Leaderboard updated within group and on user profile

## MVP feature list

### Must-have (v1)
- [x] Email/password auth (sign up, sign in, sign out)
- [x] Create group with name and settings
- [x] Join group via invite code or link
- [x] Browse football fixtures with markets and odds (mock provider for v1)
- [x] Submit one leg per member per round
- [x] Lock acca when all members submitted
- [x] Calculate combined odds and best bookmaker
- [x] Generate bookmaker betslip deep links
- [x] Resolve leg outcomes and assign points
- [x] Group and individual P&L / performance tracking
- [x] Group leaderboard

### Later (post-MVP)
- Real bookmaker odds API integration (The Odds API, etc.)
- Push notifications when round locks or leg settles
- Multiple sports beyond football
- Stake pooling / payment tracking
- Chat and activity feed
- Apple / Google social sign-in
- Responsible gambling tools (deposit limits, self-exclusion links)
- UKGC compliance features if commercialised

## Non-goals (v1)

- Processing real money or placing bets on behalf of users
- Licensed bookmaker operations
- Live in-play betting
- Automated bet placement via bookmaker APIs
- Android app (iPhone scaffold only)
- Admin panel beyond basic seed data

## Success metric (v1)

**10 users** complete the full loop: sign up → join/create group → submit leg → acca locks → outcomes settle → view leaderboard.

## First vertical slice

Auth + dashboard shell: user can sign up, sign in, see an empty dashboard with CTA to create or join a group.

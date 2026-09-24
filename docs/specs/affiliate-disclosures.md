# Spec: Partner button & affiliate disclosures

| Field | Value |
|-------|-------|
| **Status** | Design + research (September 2026). No code yet |
| **Depends on** | Affiliate tracking env config — [affiliate-and-betslips.md](./affiliate-and-betslips.md) Phase A |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

This spec covers the button that carries affiliate links in the odds tables, what we must show next to it, and how we show it. [affiliate-and-betslips.md](./affiliate-and-betslips.md) covers tracking and deeplinks.

> **Not legal advice.** This is a research brief compiled from public sources in September 2026. Each programme's binding terms are issued at sign-up, sit behind the partner login and change with each campaign. Re-check each programme's current terms on approval, and have a UK gambling solicitor review before launch.

---

## 1. Findings that need action now

| # | Finding | Action |
|---|---------|--------|
| 1 | **GambleAware closed on 31 March 2026.** Funding moved to the statutory levy and NHS/public-health commissioners. The BeGambleAware brand is no longer the default sign-off. `COMPLIANCE.begambleawareUrl` in `packages/shared/src/copy.ts` still links to BeGambleAware.org: the web betslip disclosure (`acca-summary.tsx`), site footer, `/about`, `/terms`, `/support`, and the mobile `compliance.tsx` | Swap the primary signpost to the **National Gambling Helpline (GamCare) 0808 8020 133** / gamcare.org.uk. We already ship the number as `COMPLIANCE.helplineNumber`. Confirm the wording each programme now asks for once approved |
| 2 | **Betfair closed its UK & Ireland affiliate programme on 1 July 2025.** PokerStars UK followed | No Betfair partner button is possible. Betfair is filtered out of retail tables anyway (`EXCHANGE_BOOKMAKER_IDS`) |
| 3 | **Logos come from Google favicons** (`bookmakerLogoUrl`). Every programme's brand terms require the operator's supplied creative, unaltered | For partner rows, serve the logo from the programme's asset pack (store locally), not the favicon |
| 4 | **UKGC bonus rules from 19 January 2026.** Wagering is capped at 10x, and mixed-product offers are banned (for example, bet on football and get casino spins) | Never show a casino or mixed-product offer in a football odds table. Casumo, Grosvenor and LeoVegas are casino-first brands, so check their offer copy carefully |

---

## 2. The partner button (design)

The button goes in the **Compare bookmakers** ranking (`acca-summary.tsx`, mobile `round/acca-summary.tsx`). It appears only on rows whose bookmaker has live affiliate config.

### Visual

- **Colour: new `partner` token, warm orange `#FF8A3D`** (hover `#FFA566`, text `#1A0D00`). Every current CTA and the rank-1 row use the sky-blue accent. Orange is its complement on the navy background, so the partner button is the only warm, filled control in the table. Contrast with the text is about 8:1. Add the token to `BRAND_COLORS` + `globals.css` and keep them in sync (`npm run check:brand`).
- **Shape:** a filled pill, larger than the existing outline **Open** pill (min 40px tall on touch), with an external-link arrow. The existing **Open** link stays as the plain bet link.
- **Placement:** a full-width **partner strip** under the bookmaker row, not squeezed into the row. At 375–400px the row already holds rank, logo, name, odds and **Open**. The strip holds the **Ad** chip, the button, and (when an offer is shown) its significant terms.
- **Motion:** one soft shine sweep when the strip first scrolls into view, never looping. Disabled under `prefers-reduced-motion`. No pulsing, countdowns or urgency copy (CAP 16, socially responsible).
- **Label:** `Bet at {Bookmaker}` for a link-only strip. `Claim offer` only when a verbatim offer and its significant terms are present.

### Two variants

| Variant | Shows | Compliance load | Use |
|---------|-------|-----------------|-----|
| **A: link only** | `Ad` chip · `Bet at {Bookmaker} ↗` · `18+` | Low. No offer terms to keep current | **Launch with this** |
| **B: with offer** | A + one-line headline offer + significant terms inline + `Full T&Cs` link | High. Terms must be verbatim and current; a stale term is a breach | Add once admin-managed offer copy exists (Phase 2 below) |

### Guardrails

- **Ranking stays odds-only.** The button never changes the order, the "Best" badge or the primary CTA's bookmaker. Show a table-level line: *"Ranked by combined odds. Partner links don't change the order."* Paid or undisclosed ranking is a banned practice under the DMCC Act 2024 (in force 6 April 2025).
- **Only for eligible viewers:** signed-in users (DOB-verified 18+ at sign-up) in the UK. Hide the strip on public or marketing pages without an age gate, and outside the UK.
- **User opt-out:** a *Hide bookmaker offers* switch on `/account` hides all partner strips. This covers users who have self-excluded (GAMSTOP) and don't want to see betting prompts.
- **No partner links in group chat, push or email** until each programme confirms that channel is allowed. bet365, for example, refuses direct-messaging-style traffic (SMS, WhatsApp, Telegram).

---

## 3. Disclosure pattern: hover vs. alternatives

**Recommendation: don't use a hover-only popover.** Use layered disclosure instead:

| Layer | Where | Contains | Visibility |
|-------|-------|----------|-----------|
| **1. Inline** | On the partner strip | `Ad` chip, `18+`, and for variant B the headline offer plus its **significant terms** | Always visible. Required |
| **2. Details** | An `ⓘ Terms & how we're paid` toggle on the strip. It opens on click/tap, hover (fine pointers), and keyboard focus | Full-terms link (one click away), operator name and licence line, commission sentence, helpline | On demand |
| **3. Page** | `/affiliate-disclosure` + site footer + app footer | How we make money, how we rank, the partner list, safer-gambling resources | Linked from layer 2 and the footer |

Why hover alone fails:

1. **Touch devices can't hover.** Most sessions are on phones, and the native app has no hover at all. The disclosure would never appear for most users.
2. **The rules require the disclosure *before* the click.** CAP rule 2.1 says affiliate links must be *obviously identifiable* as ads. The ASA's guidance is that a label like "Ad" is expected, and that "affiliate" alone is unlikely to be enough. For offers, significant conditions must be *prominently displayed with the offer*. Only non-significant terms may sit one click away. Content that appears only on hover is neither obvious nor prominent.
3. **Accessibility.** Hover-only content fails WCAG 1.4.13 unless it's also reachable by keyboard and dismissible. Keyboard and screen-reader users would miss it.

Using a hover popover for **layer 2** is fine, as long as it also opens on tap and focus.

---

## 4. What must be displayed: universal requirements

These apply whichever bookmaker you partner with. Every programme found requires compliance with UKGC LCCP, the CAP Code (section 16 Gambling, section 8 Promotions) and the IGRG industry code. The UKGC also holds operators responsible for their affiliates' marketing, so the programmes check.

| # | Requirement | Source | Our implementation |
|---|-------------|--------|--------------------|
| U1 | Label affiliate links as advertising: **"Ad"** (not "affiliate" alone) | CAP 2.1; ASA affiliate-marketing guidance | `Ad` chip on every partner strip |
| U2 | **18+** on gambling marketing | IGRG code; every programme's terms (e.g. Betfred requires 18+ signage) | `18+` on the strip; already in the betslip disclosure |
| U3 | **Signpost to safer-gambling support** | IGRG code; programme terms (Betfred: "a link to a responsible gambling body"; Casumo: "contact details to a help-organisation") | National Gambling Helpline 0808 8020 133 / gamcare.org.uk (**replace BeGambleAware**, finding 1) |
| U4 | **Significant terms next to any offer**, verbatim from the operator. Full T&Cs at most **one click** away | CAP 8 + gambling free-bets guidance; BetVictor, LivePartners and Entain guidelines | Variant B only. Offer copy entered by admin from the programme, never written by us |
| U5 | **Commission disclosure** ("we may earn commission") | CAP 2.1; DMCC Act (paid endorsements) | Existing `COMPLIANCE.betslipDisclosure` + layer 2 |
| U6 | **Ranking disclosure**: how results are ordered and how we are paid | DMCC Act 2024 banned practices; CMA guidance (CMA207) | Table line + `/affiliate-disclosure` |
| U7 | **Approved creative only.** Operator logos and brand assets unaltered | Every programme's brand terms (BetVictor: off-brand creative "can result in account closure and commission held") | Partner logos from each programme's asset pack |
| U8 | **No strong appeal to under-18s.** No current top-flight footballers or youth-culture imagery near the button | CAP 16.3.12; ASA enforcement notice (active monitoring from 11 June 2026) | Keep the strip text-only plus the operator logo |
| U9 | **Don't target under-18s or self-excluded users.** UK audience only | UKGC LCCP; every programme | Signed-in 18+ users, UK only, *Hide bookmaker offers* opt-out |
| U10 | **Offers must be UKGC-compliant.** Wagering ≤ 10x, no mixed-product incentives (from 19 Jan 2026) | UKGC LCCP changes | Admin review before an offer goes live |
| U11 | **No irresponsible framing.** No "guaranteed", "free money" or urgency. No "free" for live streaming (Kindred) | CAP 16; Betway, Kindred terms | Fixed copy templates; no user-editable button text |

---

## 5. Per-bookmaker register

Bookmakers that can appear in our retail tables: The Odds API `uk` region, plus the API-Football depth feed (Phase 3 of [odds-and-results-sourcing.md](./odds-and-results-sourcing.md)) for bet365 and Betfred. Check the live list against `/admin/odds` diagnostics before applying.

"Specific requirements" lists what public sources show **on top of** U1–U11. Every programme publishes the rest (offer terms, creative packs, exact footer wording) to approved partners only. Collect it at approval and record it here.

| Bookmaker (Odds API id) | Programme | Status (Sept 2026) | Specific requirements found | Collect on approval |
|---|---|---|---|---|
| bet365 (`bet365`) | bet365 Partners | Open | Promote responsible gambling per programme terms. Never target under-18s. No direct-marketing traffic as the main source (SMS, WhatsApp, Telegram). No blind traffic or affiliate networks. The programme runs its own compliance-monitoring tools on partner content | Partner guidelines; tracking link format; logo pack |
| Paddy Power (`paddypower`) | Paddy Power Affiliates (Flutter) | Open. Approval takes 1–2 weeks | Nothing public beyond U1–U11 | Full terms; brand pack; RG wording |
| Sky Bet (`skybet`) | Affiliate Hub (Sky Betting & Gaming, Flutter) | Open | Nothing public beyond U1–U11 | Full terms; brand pack; RG wording |
| Betfair (`betfair_*`) | — | **Closed 1 Jul 2025** | Not possible | — |
| William Hill (`williamhill`) | William Hill Affiliates (evoke) | Open | Publishes separate *UK Marketing Guidelines* for UK affiliates | UK Marketing Guidelines doc |
| 888sport (`sport888`) | 888 Affiliates (evoke) | Open | Same group as William Hill; assume the evoke UK guidelines | UK Marketing Guidelines doc |
| Ladbrokes (`ladbrokes_uk`) | Entain Partners | Open | *UK & ROI Marketing Guidelines*: terms must be "clear, transparent… plain and intelligible". Social media use must follow Entain guidance. Influencers need prior approval and must be 25+. Compliance documents due within 30 days of sign-up | UK & ROI Marketing Guidelines PDF |
| Coral (`coral`) | Entain Partners | Open | As Ladbrokes | As Ladbrokes |
| Betfred (`betfred`) | Betfred Affiliates | Open | **Must include a responsible-gambling link and 18+ signage.** Comply with the IGRG code and CAP section 16. No incentivised traffic | Current RG body to link (their terms still say gambleaware.org) |
| Betway (`betway`) | Betway Partners | Open | Don't portray excessive or irresponsible gambling. Comply with licence conditions and the Bribery Act. Keep records of marketing activity for 2 years after termination | UK guidelines |
| BetVictor (`betvictor`) | BV Group Affiliates | Open | **Significant-terms disclaimer on every offer banner.** Full T&Cs no more than one click away. On-brand approved creative only, or risk account closure and withheld commission. Periodic safer-gambling posts when promoting on social media | Creative pack; offer terms |
| Unibet (`unibet_uk`) | Kindred Affiliates (FDJ United) | Open | Never advertise live streaming as a pure streaming service, and never call it "free". Breaches lead to suspension or termination | UK market terms |
| LeoVegas (`leovegas`) | LeoVegas Affiliates | **Selective.** Works with a small number of UK affiliates | Previously fined partly over affiliate ads missing significant terms, so expect strict review | Application may be refused |
| BetMGM UK / BetUK (`betmgm`, `betuk`) | LeoVegas Group | Selective | As LeoVegas | As LeoVegas |
| Casumo (`casumo`) | Casumo Affiliates | Open | **All adverts show 18+ and contact details of a gambling-help organisation.** No child-friendly images. Casino-first brand, so beware the mixed-product ban (U10) | Sports-only offer copy |
| Grosvenor (`grosvenor`) | Rank Affiliates | Open | Casino-focused programme. Confirm sports offers are in scope. Mixed-product ban (U10) | Whether sports is covered |
| LiveScore Bet (`livescorebet`) | LivePartners | Open | Published UK affiliate guidelines: significant conditions shown prominently with the offer. Other T&Cs at most one click away, or a prominent direct link. Free-bet commitments stated in the ad itself. No marketing on RG advice pages | Guidelines page |
| Virgin Bet (`virginbet`) | LivePartners (LiveScore Group) | Open | As LiveScore Bet | As LiveScore Bet |
| BoyleSports (`boylesports`) | BoyleSports Affiliates | Open | Code of conduct: social content age-gated to **25+** followers. Nobody who is, or looks, under 25 in marketing. 24-hour cookie. UKGC account 39469 | Code of conduct |

---

## 6. Build phases

### Phase 1: partner strip, variant A (after the first programme approves)

- [ ] Fix finding 1: swap BeGambleAware for GamCare / National Gambling Helpline in `COMPLIANCE` and the pages listed in finding 1
- [ ] `partner` colour token in `BRAND_COLORS` + `globals.css`
- [ ] `isAffiliatePartner(bookmakerId)` server-side (from `AFFILIATE_<ID>_PARAMS`) → `partner: boolean` on `AccaBookmakerRanking` in the group API response
- [ ] Shared copy in `packages/shared/src/copy.ts`: strip label, `Ad`, ranking line, layer-2 text
- [ ] Web `PartnerStrip` in `components/group/`; mobile equivalent in `src/components/round/`
- [ ] Layer-2 details toggle (click/tap/focus, plus hover on fine pointers)
- [ ] `/affiliate-disclosure` page + footer link
- [ ] UK-only + signed-in gating; *Hide bookmaker offers* preference on `/account`
- [ ] Partner logos from programme asset packs
- [ ] Outbound click metric (Phase C of the affiliate spec)

### Phase 2: offers, variant B

- [ ] Admin-managed offer copy per bookmaker (headline, significant terms, full-T&Cs URL, valid-from/to) with an audit trail
- [ ] Offers expire automatically at `validTo`, so a stale offer never renders
- [ ] Admin checklist on save: verbatim from programme, ≤ 10x wagering, sports-only

---

## Open questions

| Question | Notes |
|----------|-------|
| Replace or keep the existing **Open** link on partner rows? | A partner strip plus **Open** gives two links to the same bookmaker. Tracking is already appended to **Open**, so the strip could be the only link on partner rows. Decide once we see click data |
| Show partner styling on the primary CTA when the best bookmaker is a partner? | Yes, as long as the bookmaker was chosen by odds, not by partnership |
| Apple Guideline 5.3 with live affiliate links in the iOS app | Update `docs/app-store/compliance-statement.md` before shipping partner buttons to mobile |

---

## Sources (retrieved September 2026)

- GambleAware closure: [CasinoBeats](https://casinobeats.com/2025/07/26/gambleaware-to-shutter-in-2026-as-uk-gov-takes-over-gambling-harm-prevention/), [Gambling Insider](https://www.gamblinginsider.com/news/30455/gambleaware-to-enter-new-era-of-gambling-reform-with-managed-closure), [SBC News](https://sbcnews.co.uk/features/comment/2026/03/31/gambleaware-close-2026/)
- National Gambling Helpline: [GamCare](https://www.gamcare.org.uk/)
- CAP/ASA: [Online affiliate marketing](https://www.asa.org.uk/advice-online/affiliate-marketing.html), [Free bets and bonuses](https://www.asa.org.uk/advice-online/gambling-betting-and-gaming-free-bets-and-bonuses.html), [Gambling on your affiliates?](https://www.asa.org.uk/news/gambling-on-your-affiliates.html), [Appeal to children](https://www.asa.org.uk/advice-online/betting-and-gaming-appeal-to-children.html), [Enforcement notice: strong appeal to under-18s](https://www.asa.org.uk/resource/enforcement-notice-gambling-ads-with-strong-appeal-to-under-18s.html)
- UKGC: [Affiliates or third parties](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/affiliates-or-third-parties), [LCCP upcoming changes](https://www.gamblingcommission.gov.uk/licensees-and-businesses/page/lccp-upcoming-changes); bonus rules summary at [igaming.com](https://www.igaming.com/igamingcare/new-uk-bonus-rules/)
- IGRG code: [BGC, 7th edition](https://bettingandgamingcouncil.com/uploads/22703-BGC-IGRG-Code-7th-Edition-111023.pdf)
- DMCC / CMA: [CMA207 Unfair commercial practices](https://assets.publishing.service.gov.uk/media/691b9bd821ef5aaa6543ee6f/Unfair_commercial_practices_CMA207_18_Nov_2025__2_.pdf), [CMS: consumer elements in force 6 April 2025](https://cms.law/en/gbr/legal-updates/the-dmcc-act-consumer-elements-come-into-force-from-6-april-2025)
- Betfair programme closure: [SBC News](https://sbcnews.co.uk/featurednews/2025/05/26/betfair-closes-affiliate-uk/), [Yogonet](https://www.yogonet.com/international/news/2025/05/28/106152-betfair-to-end-uk-and-ireland-affiliate-programme)
- Programmes: [bet365 Partners guidelines](https://www.bet365partners.com/en/partnerguidelines), [Paddy Power Affiliates](https://partnerships.paddypower.com/index.html), [Sky Bet Affiliate Hub](https://x.com/skyaffiliatehub), [William Hill UK marketing guidelines](https://affiliates.williamhill.com/uk-marketing-guidelines.html), [Entain UK & ROI Marketing Guidelines](https://www.entainpartners.com/files/Marketing_Guidelines.pdf), [Entain partner T&Cs](https://www.entainpartners.com/gvcLegal.do), [Betfred Affiliates compliance](https://www.betfredaffiliates.com/compliance), [Betway Partners terms](https://www.betwaypartners.it/en/TermsAndConditions), [BetVictor affiliate compliance guidelines](https://www.betvictor.com/lp/affiliates-advertising-promotion-compliance-regulation), [Kindred Affiliates UK](https://kindredaffiliates.com/markets/uk/), [LeoVegas UK affiliate limits](https://igamingbusiness.com/legal-compliance/leovegas-to-limit-affiliate-numbers-in-uk/), [Casumo marketing guidelines](https://casumopartners.com/marketing-guidelines/), [Rank Affiliates: Grosvenor](https://www.rankaffiliates.com/who-we-are/grosvenor-casino/), [LivePartners UK guidelines](https://www.livepartners.co.uk/affiliate-advertising-guidelines-uk.html), [BoyleSports code of conduct](https://affiliates.boylesports.com/affiliate-code-of-conduct/)

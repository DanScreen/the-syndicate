# Spec: Partner button & affiliate disclosures

| Field | Value |
|-------|-------|
| **Status** | Design + research (September 2026), verified against primary sources 24 Sep 2026. No code yet |
| **Depends on** | Affiliate tracking env config — [affiliate-and-betslips.md](./affiliate-and-betslips.md) Phase A |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |
| **Research log** | [affiliate-disclosures-research.md](./affiliate-disclosures-research.md): confidence per finding and open verification tasks |

This spec covers the button that carries affiliate links in the odds tables, what we must show next to it, and how we show it. [affiliate-and-betslips.md](./affiliate-and-betslips.md) covers tracking and deeplinks.

> **Not legal advice.** This is a research brief compiled from public sources in September 2026. Each programme's binding terms are issued at sign-up, sit behind the partner login and change with each campaign. Re-check each programme's current terms on approval, and have a UK gambling solicitor review before launch.

---

## 1. Findings that need action now

| # | Finding | Action |
|---|---------|--------|
| 1 | **The GambleAware charity closed on 31 March 2026, but the website and brand continue under the Department of Health and Social Care.** begambleaware.org now 301-redirects to gambleaware.org, and its branding page still asks gambling communications to carry the logo. The IGRG code (Feb 2026) accepts GamCare **or** GambleAware, and every programme read still names BeGambleAware / GambleAware.org. `COMPLIANCE.begambleawareUrl` in `packages/shared/src/copy.ts` points at the redirecting begambleaware.org domain. It's used by the web betslip disclosure (`acca-summary.tsx`), site footer, `/about`, `/terms`, `/support` and mobile `compliance.tsx` | **Done (24 Sep 2026).** Kept the signpost: `COMPLIANCE.gambleawareUrl` → `https://www.gambleaware.org`, label `GambleAware.org` (keys renamed from `begambleaware*`). Helpline 0808 8020 133 unchanged |
| 2 | **Betfair closed its UK & Ireland affiliate programme on 1 July 2025.** PokerStars UK followed | No Betfair partner button is possible. Betfair is filtered out of retail tables anyway (`EXCHANGE_BOOKMAKER_IDS`) |
| 3 | **Logos come from Google favicons** (`bookmakerLogoUrl`). Every programme's brand terms require the operator's supplied creative, unaltered | For partner rows, serve the logo from the programme's asset pack (store locally), not the favicon |
| 4 | **UKGC bonus rules from 19 January 2026** (SR code 5.1.1 paras 3a/3b). Wagering is capped at 10x, and mixed-product offers are banned (for example, bet on football and get casino spins) | Never show a casino or mixed-product offer in a football odds table. Grosvenor's listed sports offer ("Bet £20 on Sports and get a £20 Casino Bonus") is exactly this pattern. Casumo, Grosvenor and LeoVegas are casino-first brands, so check their offer copy carefully |
| 5 | **"We may earn commission" is the wording the ASA calls unacceptable.** A generic disclaimer that the author "may" receive commission is unlikely to be acceptable (ASA affiliate guidance, citing MailOnline 2022). Shipped in `COMPLIANCE.betslipDisclosure` and `COMPLIANCE.footerBody` | **Done (24 Sep 2026).** Both now read "We earn commission from some bookmakers if you sign up or bet via these/our links." |
| 6 | **Google Play bans apps that track odds and direct users to betting sites** unless they are approved, licensed gambling apps. Its listed violation is "a dedicated sports odds tracker app containing integrated gambling ads linking to a sports betting site". This touches the current Android app (odds + **Open** betslip links), not just the Join button | **Decided (24 Sep 2026): no Play Store release.** Affiliate links are the income, so Android users use the website instead. A future Android build could carry ads instead of links, but Play also bars gambling ads in apps that show odds, so those would have to be non-gambling ads or the build would drop odds |
| 7 | **Northern Ireland isn't covered by the Gambling Act 2005.** Entain's guidelines warn that the NI 1985 Order makes inviting the public to stake money on gaming an offence, and some offers are "New GB customers only" | Show Join buttons to **GB** users only, not all of the UK, unless a programme confirms NI |

---

## 2. The partner button (design)

The button goes in the **Compare bookmakers** ranking (`acca-summary.tsx`, mobile `round/acca-summary.tsx`). It appears only on rows whose bookmaker has live affiliate config.

### Visual

- **Colour: new `partner` token, violet `#A78BFA`** (gradient to `#8B7CF8`, hover `#C4B5FD`, text `#120A2E`, contrast 5.7:1 or better). Violet sits next to the brand's sky blue on the colour wheel, so it matches the theme but is clearly different from every other control (all current CTAs and the rank-1 row use sky blue). A warm orange was tried first and rejected as too far from the theme. Add the token to `BRAND_COLORS` + `globals.css` and keep them in sync (`npm run check:brand`).
- **Shape:** a filled pill, 70 × 30px, with a 44px-tall tap area. It's the only filled control in the row; **Open** stays an outline.
- **Placement: in the row, to the right of Open.** The row doesn't grow a second line. To make room, the odds move under the bookmaker name (the row gets about 4px taller). Every row reserves the same 70px Join slot, so the **Open** buttons line up whether or not the bookmaker is a partner. The rank badge is a fixed 38px wide. Long names shorten with "…". Built for 360px+ phones; below that (rows under 280px wide) the logo hides so the name still shows.
- **Label:** `Ad` tag + `Join`. No bookmaker name, so the width is the same on every row. Accessible name: "Join {Bookmaker} (advert, opens in new tab)". The ASA accepts "Ad" / "(Ad)" on any medium; `#ad` is a social-media convention. The IGRG code (para 58) and some programmes (FDJ United, William Hill) do write "#ad" for all affiliate ads, so **ask each programme at approval whether `Ad` is accepted** and switch that programme's rows to `#ad` only if it insists.
- **Motion:** one soft shine across the button on load, never looping. Disabled under `prefers-reduced-motion`. No pulsing, countdowns or urgency copy (CAP 16, socially responsible).
- **Mockup:** [Tiki Acca Partner Button](https://claude.ai/artifact/9ye4n5MvGCzshQb19jVYJi) (private until shared).

### Offers

A welcome offer can't sit in the row, because its significant terms must be shown with it (U4). Launch with the Join button only. If offers come later (admin-managed copy, Phase 2), they get their own block below the table with the terms inline.

### Guardrails

- **Ranking stays odds-only.** The button never changes the order, the "Best" badge or the primary CTA's bookmaker. Show a table-level line: *"18+ · Ranked by combined odds. Ad links earn us commission and don't change the order."* The DMCC Act 2024 has no specific ranking rule, but hiding the commercial link is: paid content not made clear is banned practice 12, and failing to identify commercial intent is a misleading omission (CMA207 paras 6.8, 4.13). If we ever let payment affect the order, the line must say so.
- **Only for eligible viewers:** signed-in users (DOB-verified 18+ at sign-up) in **Great Britain** (finding 7). Hide the button on public or marketing pages without an age gate, in Northern Ireland and outside the UK.
- **How we know the viewer is in GB.** Cloudflare already proxies every web and API request (see [DEPLOYMENT.md](../DEPLOYMENT.md) DDoS section), so the server can read its geolocation headers. No GPS or location permission is needed:
  - `CF-IPCountry` (on by default) must be `GB`. It covers the whole UK, so NI isn't excluded by this alone.
  - Turn on the **Add visitor location headers** Managed Transform (Cloudflare → Rules → Transform Rules → Managed Transforms; check it's available on our plan) to get `cf-region-code`. Exclude `NIR`.
  - The group API works out `partnerEligible` per request and the clients just render it. This covers the iOS app too, since it calls the same API through Cloudflare.
  - **Fail closed:** if a header is missing (local dev, direct `*.run.app` traffic) or the value is anything else, show no Join buttons. Only trust these headers when `ORIGIN_AUTH_SECRET` is enforcing Cloudflare-only traffic.
  - IP location is approximate: VPNs, and mobile networks whose IPs geolocate to another region. That's accepted as reasonable steps, together with the 18+ sign-up check, UK-only App Store availability and the *Hide bookmaker offers* opt-out. If a programme wants more, add a self-declared "Where do you live?" (England / Scotland / Wales / Northern Ireland / elsewhere) on `/account` and require both checks to pass.
- **Never next to help content.** No Join buttons on `/support`, safer-gambling pages or anything a user reaches while looking for help (ASA ruling against Smart Gravity Ltd, 9 Sep 2026).
- **User opt-out:** a *Hide bookmaker offers* switch on `/account` hides all Join buttons. This covers users who have self-excluded (GAMSTOP) and don't want to see betting prompts.
- **No partner links in group chat, push or email.** Treat this as a hard rule, not a wait-for-confirmation item. William Hill bans push notifications, email, SMS and WhatsApp to own databases. bet365 bans email, SMS and push without written consent. Betfred, Casumo and BoyleSports ban or restrict email and SMS. The UKGC holds operators "primarily responsible" for affiliates' direct marketing to self-excluded people.
- **Name every surface on the application.** bet365 only allows links on websites or apps named in the partner application, and Entain's definition of an affiliate site includes apps. List the web app and both mobile apps.

---

## 3. Disclosure pattern: hover vs. alternatives

**Recommendation: don't use a hover-only popover.** Use layered disclosure instead:

| Layer | Where | Contains | Visibility |
|-------|-------|----------|-----------|
| **1. Inline** | On each Join button + one line at the top of the table | `Ad` tag on the button. Table line: `18+`, ranked by combined odds, Ad links earn us commission and don't change the order | Always visible. Required |
| **2. Details** | One `How we're paid` toggle in the table line, for the whole table. Opens on click/tap and keyboard | Commission explained, bookmakers are licensed and their T&Cs apply, helpline, link to layer 3 | On demand |
| **3. Page** | `/affiliate-disclosure` + site footer + app footer | How we make money, how we rank, the partner list, safer-gambling resources | Linked from layer 2 and the footer |

Why hover alone fails:

1. **Touch devices can't hover.** Most sessions are on phones, and the native app has no hover at all. The disclosure would never appear for most users.
2. **The rules require the disclosure *before* the click.** CAP rule 2.1 says affiliate links must be *obviously identifiable* as ads. The ASA's guidance is that commercial content must be clear "prior to engagement": a label like "(Ad)" is expected, and "affiliate" alone is unlikely to be enough. For offers, significant conditions must be *prominently displayed with the offer*. Only non-significant terms may sit one click away. Content that appears only on hover is neither obvious nor prominent.
3. **Accessibility.** Hover-only content fails WCAG 1.4.13 unless it's also reachable by keyboard and dismissible. Keyboard and screen-reader users would miss it.

Using a hover popover for **layer 2** is fine, as long as it also opens on tap and focus.

---

## 4. What must be displayed: universal requirements

These apply whichever bookmaker you partner with. Every programme found requires compliance with UKGC LCCP, the CAP Code (section 16 Gambling, section 8 Promotions) and the IGRG industry code (7th edition, updated February 2026). The UKGC also holds operators responsible for their affiliates' marketing (SR code 1.1.2), so the programmes check. Evidence for each row is in the [research log](./affiliate-disclosures-research.md).

| # | Requirement | Source | Our implementation |
|---|-------------|--------|--------------------|
| U1 | Label affiliate links as advertising **before the click**: **"Ad"** (not "affiliate" alone) | CAP 2.1; ASA affiliate-marketing guidance ("(Ad)" acceptable); IGRG para 58 and FDJ United / William Hill write "#ad" | `Ad` tag on every Join button; confirm with each programme |
| U2 | **18+** on gambling marketing | IGRG para 45; every programme's terms (e.g. Betfred requires 18+ signage) | `18+` in the table disclosure line; already in the betslip disclosure |
| U3 | **Signpost to safer-gambling support** | IGRG paras 27, 46 (GamCare or GambleAware); programme terms (William Hill, Entain, BV Group, LivePartners: "BeGambleAware" / "GambleAware.org"; Betfred: "a link to a responsible gambling body"; Casumo: "contact details to a help-organisation") | **GambleAware.org** linking to `https://www.gambleaware.org` + National Gambling Helpline 0808 8020 133 (finding 1) |
| U4 | **Significant terms next to any offer**, verbatim from the operator. Full T&Cs at most **one click** away | CAP 8 + gambling free-bets guidance; BetVictor, LivePartners and Entain guidelines | Offers block only (Phase 2). Offer copy entered by admin from the programme, never written by us |
| U5 | **Commission disclosure**, stated definitely ("we earn commission"), not "we may earn" | CAP 2.1; ASA affiliate guidance (MailOnline 2022); DMCC banned practice 12 | Reworded `COMPLIANCE.betslipDisclosure` / `footerBody` (finding 5) + layer 2 |
| U6 | **Ranking disclosure**: how results are ordered and how we are paid | Good practice to avoid a misleading omission (CMA207 paras 4.13, 6.8). No specific UK ranking rule | Table line + `/affiliate-disclosure` |
| U7 | **Approved creative only.** Operator logos and brand assets unaltered | Every programme's brand terms (BetVictor: off-brand creative "can result in account closure and commission held") | Partner logos from each programme's asset pack |
| U8 | **No strong appeal to under-18s.** No current top-flight footballers or youth-culture imagery near the button | CAP 16.3.12; ASA enforcement notice (active monitoring from 11 June 2026) | The button stays text-only |
| U9 | **Don't target under-18s or self-excluded users.** GB audience only | UKGC LCCP; UKGC affiliates page; bet365, LivePartners; Entain NI appendix | Signed-in 18+ users, GB only, *Hide bookmaker offers* opt-out, never beside help content |
| U10 | **Offers must be UKGC-compliant.** Wagering ≤ 10x, no mixed-product incentives (from 19 Jan 2026) | UKGC SR code 5.1.1 (3a, 3b) | Admin review before an offer goes live |
| U11 | **No irresponsible framing.** No "guaranteed", "free money", "risk free" or urgency. Don't call an offer "free" if the customer must stake their own money. No "free" for live streaming (FDJ United) | CAP 16; ASA free-bets guidance; Casumo, FDJ United terms | Fixed copy templates; no user-editable button text |
| U12 | **No direct marketing with partner links**: push, email, SMS, WhatsApp, group chat | UKGC affiliates page; William Hill, bet365, Betfred, Casumo, BoyleSports, FDJ United | Join buttons live in the odds table only |

---

## 5. Per-bookmaker register

Bookmakers that can appear in our retail tables come from The Odds API `uk` region (verified 24 Sep 2026): sport888, betano_uk, betfred_uk, betvictor, betway, boylesports, casumo, coral, grosvenor, ladbrokes_uk, leovegas, livescorebet, paddypower, skybet, unibet_uk, virginbet, williamhill. The exchanges (betfair_ex_uk, betfair_sb_uk, matchbook, smarkets) are filtered out by `EXCHANGE_BOOKMAKER_IDS`. bet365 appears only once the API-Football depth feed ships (Phase 3 of [odds-and-results-sourcing.md](./odds-and-results-sourcing.md)). BetMGM and BetUK aren't in either feed. Check the live list against `/admin/odds` diagnostics before applying.

"Specific requirements" lists what public sources show **on top of** U1–U12. Every programme publishes the rest (offer terms, creative packs, exact footer wording) to approved partners only. Collect it at approval and record it here.

| Bookmaker (Odds API id) | Programme | Status (Sept 2026) | Specific requirements found | Collect on approval |
|---|---|---|---|---|
| bet365 (not in The Odds API; future API-Football feed) | bet365 Partners | Open | No email, SMS, push or targeted pop-ups without written consent; never to self-excluded people. **Links only on sites and apps named in the application.** No blind traffic or affiliate networks. Guidelines page not read (JS) | Partner guidelines; tracking link format; logo pack |
| Paddy Power (`paddypower`) | Paddy Power Affiliates (Flutter) | **Unverified.** Flutter closed Betfair's and PokerStars' UK programmes | Nothing public | Check the programme still takes UK affiliates |
| Sky Bet (`skybet`) | — | **Affiliate Hub closed in 2017.** A later "Skybet Partners" is mentioned only on third-party sites | — | Confirm whether any programme exists |
| Betfair (`betfair_*`) | — | **Closed 1 Jul 2025** | Not possible | — |
| William Hill (`williamhill`) | William Hill Affiliates (evoke) | Open. **evoke is being bought by Bally's Intralot** (completion Q4 2026–Q1 2027), so expect changes | *UK Marketing Guidelines*: 18+, BeGambleAware and **#ad on all adverts**; key qualifying criteria with the offer; full T&Cs one click away. Social: 75% audience 18+, target 25+; nobody under 25 in imagery; no Premier League footballers. **No push notifications**, SMS, WhatsApp, email or post to own or bought databases | Offer terms; brand pack |
| 888sport (`sport888`) | 888 Affiliates (evoke) | Open (same takeover) | Assume the William Hill UK guidelines | 888's own UK guidelines |
| Ladbrokes (`ladbrokes_uk`) | Entain Partners | Open | *UK & ROI Marketing Guidelines V1.0*: footer "18+ \| begambleaware.org \| Gamble responsibly"; significant terms with the headline and **before the CTA**. Terms "clear, transparent… plain and intelligible". Influencers 25+ with prior approval. Affiliate site includes apps. NI appendix (finding 7). Compliance documents due within 30 days | Offer terms; brand pack |
| Coral (`coral`) | Entain Partners | Open | As Ladbrokes | As Ladbrokes |
| Betfred (`betfred_uk`) | Betfred Affiliates | Open | **18+ and a link to a responsible gambling body** (their example: gambleaware.org). #AD on social posts. IGRG + CAP 16; regular safer-gambling content. No incentivised traffic. No email, SMS, phone or post marketing. No promotion on Snapchat, WhatsApp, Telegram, YouTube or Twitch. No advertorial-style content | Offer terms; brand pack |
| Betway (`betway`) | Super Partners (Super Group) | Unverified for UK. The UK programme now runs through superpartners.com | Only the Italian terms seen (records kept 2 years; no excessive-gambling portrayal) | UK guidelines |
| BetVictor (`betvictor`) | BVGroup Affiliates | Open | UK guidelines: "GambleAware.org", "18+" and "T&C apply" on every advert; say "New Customers" or "Existing Customers". Significant terms (wagering, deposit, withdrawal limits, start/end dates) on the advert; full T&Cs ≤ 1 click. Nobody who looks under 25; social pages age-gated 18+. Approved on-brand creative only, or account closure and withheld commission | Creative pack; offer terms |
| Betano (`betano_uk`) | BVGroup Affiliates | Open | As BetVictor (same operator, BV Gaming Ltd) | As BetVictor |
| Unibet (`unibet_uk`) | FDJ United Affiliates (was Kindred) | Open | **Mark all content "#ad"**; significant terms in the promotion body; no SMS through third parties. Live streaming: no pure-streaming ads, say "funded account required", never "free". Offers are "New GB customers only". A sports + casino multiproduct offer was listed, so check mixed-product rules (U10) | UK market terms |
| LeoVegas (`leovegas`) | LeoVegas Affiliates | **Selective**, current intake unverified | Previously fined partly over affiliate ads missing significant terms, so expect strict review | Application may be refused |
| Casumo (`casumo`) | Casumo Affiliates | Open | **All adverts show 18+ and a help-organisation contact.** No email, SMS, social, native or direct marketing without approval. No "free" / "risk free" misuse. Advertorials need approval. No child-friendly images. Casino-first brand, so beware the mixed-product ban (U10) | Sports-only offer copy |
| Grosvenor (`grosvenor`) | Rank Affiliates | Open; **Grosvenor Sport is covered** | Listed sports offer is a sports-bet-for-casino-bonus: a mixed-product pattern (U10). Never surface a Grosvenor offer without checking | Sports-only offer copy |
| LiveScore Bet (`livescorebet`) | LivePartners | Open | UK guidelines: significant conditions shown prominently; "Begambleaware.org", "18+" and "T&C apply"; other T&Cs at most one click away. Free-bet commitments stated in the ad. Remove self-excluded customers from marketing databases. No marketing on RG advice pages | Offer terms |
| Virgin Bet (`virginbet`) | LivePartners (LiveScore Group) | Open | As LiveScore Bet | As LiveScore Bet |
| BoyleSports (`boylesports`) | BoyleSports Affiliates | Open | Code of conduct: mark ads #ad / "AD"; 18+; GambleAware.org for the UK plus a social-responsibility message. Social content age-gated to **25+**. Nobody who is, or looks, under 25. No SMS or email without consent. Quarterly safer-gambling content. State that communications are made without BoyleSports' involvement. 24-hour cookie | Offer terms |

**Logo domains:** `BOOKMAKER_DOMAINS` has no `betfred_uk` or `betano_uk` entry, so their favicons are guessed. This matters little once partner rows use asset-pack logos (finding 3).

---

## 6. Build phases

### Phase 1: Join button (after the first programme approves)

- [x] Fix findings 1 and 5: `COMPLIANCE.gambleawareUrl` → `https://www.gambleaware.org`, label `GambleAware.org`; "We may earn commission" → "We earn commission from some bookmakers…" in `betslipDisclosure` and `footerBody` (24 Sep 2026)
- [ ] `partner` colour token in `BRAND_COLORS` + `globals.css`
- [ ] `isAffiliatePartner(bookmakerId)` server-side (from `AFFILIATE_<ID>_PARAMS`) → `partner: boolean` on `AccaBookmakerRanking` in the group API response
- [ ] Shared copy in `packages/shared/src/copy.ts`: `Join`, `Ad`, table disclosure line, How we're paid text
- [ ] Web `PartnerJoinButton` in `components/group/` + row layout change in `acca-summary.tsx` (odds under name, fixed Join slot); mobile equivalent in `src/components/round/`
- [ ] How we're paid toggle (click/tap/keyboard)
- [ ] `/affiliate-disclosure` page + footer link
- [ ] GB-only gating from Cloudflare `CF-IPCountry` + `cf-region-code` (fail closed; enable the visitor-location Managed Transform) + signed-in; not on help/support pages; *Hide bookmaker offers* preference on `/account`
- [ ] Partner logos from programme asset packs
- [ ] Outbound click metric (Phase C of the affiliate spec)

### Phase 2: offers block

- [ ] Admin-managed offer copy per bookmaker (headline, significant terms, full-T&Cs URL, valid-from/to) with an audit trail
- [ ] Offers expire automatically at `validTo`, so a stale offer never renders
- [ ] Admin checklist on save: verbatim from programme, ≤ 10x wagering, sports-only

---

## Open questions

| Question | Notes |
|----------|-------|
| Keep both **Open** and **Join** on partner rows? | Decided for now: both, side by side in the row. Tracking params are also appended to **Open**, so revisit with click data |
| Show partner styling on the primary CTA when the best bookmaker is a partner? | Yes, as long as the bookmaker was chosen by odds, not by partnership |
| Apple Guideline 5.3 with live affiliate links in the iOS app | 5.3.4 covers apps that offer real-money gaming; nothing specific on link-outs. 5.1.1(ix): apps in regulated fields including gambling "should be submitted by a legal entity… not by an individual developer"; check which account type we use. Add a Join-button paragraph to `docs/app-store/compliance-statement.md` before shipping to iOS |
| Google Play and bookmaker links on Android (finding 6) | **Decided: no Play release for now; Android users use the website.** Possible later: an Android build with ads instead of bookmaker links (non-gambling ads, or no odds). See [research log](./affiliate-disclosures-research.md) A10 and [ANDROID_LAUNCH.md](../../apps/mobile/ANDROID_LAUNCH.md) |
| Northern Ireland | Decided: Join buttons GB-only (finding 7), detected from Cloudflare headers (§2). Revisit if a programme confirms NI is fine |
| `Ad` vs `#ad` tag | Decided: `Ad` (the ASA's own example; `#ad` reads as a social-media hashtag). Confirm with each programme at approval. The mockup shows `AD`; restyle to `Ad` when building |

---

## Sources (retrieved September 2026)

Quotes and dates for each source are in the [research log](./affiliate-disclosures-research.md) §2.

- GambleAware (now DHSC): [privacy notice](https://www.gambleaware.org/privacy-notice/), [branding and logos](https://www.gambleaware.org/branding-logos/), [get help now](https://www.gambleaware.org/get-help-now/). National Gambling Helpline: [GamCare](https://www.gamcare.org.uk/)
- CAP/ASA: [Online affiliate marketing](https://www.asa.org.uk/advice-online/affiliate-marketing.html), [Free bets and bonuses](https://www.asa.org.uk/advice-online/gambling-betting-and-gaming-free-bets-and-bonuses.html), [Gambling on your affiliates?](https://www.asa.org.uk/news/gambling-on-your-affiliates.html), [Appeal to children](https://www.asa.org.uk/advice-online/betting-and-gaming-appeal-to-children.html), [Enforcement notice: strong appeal to under-18s](https://www.asa.org.uk/resource/enforcement-notice-gambling-ads-with-strong-appeal-to-under-18s.html), [Ruling: Dribble Media t/a Midnite](https://www.asa.org.uk/rulings/dribble-media-ltd-g25-1300959-dribble-media-ltd.html), Smart Gravity ruling via [SBC News](https://sbcnews.co.uk/affiliatenews/2026/09/10/asa/)
- UKGC: [Affiliates or third parties](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/affiliates-or-third-parties), [Gambling promotions to be safer and simpler](https://www.gamblingcommission.gov.uk/news/article/gambling-promotions-to-be-safer-and-simpler), [LCCP upcoming changes](https://www.gamblingcommission.gov.uk/licensees-and-businesses/page/lccp-upcoming-changes), [LCCP previous changes](https://www.gamblingcommission.gov.uk/licensees-and-businesses/page/lccp-previous-changes)
- IGRG code: [BGC, 7th edition updated February 2026](https://bettingandgamingcouncil.com/uploads/IGRG_2026-03-03-133712_dwft.pdf)
- DMCC / CMA: [CMA207 Unfair commercial practices](https://assets.publishing.service.gov.uk/media/691b9bd821ef5aaa6543ee6f/Unfair_commercial_practices_CMA207_18_Nov_2025__2_.pdf)
- App stores: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (5.1.1(ix), 5.3), [Google Play: Real-Money Gambling, Games, and Contests](https://support.google.com/googleplay/android-developer/answer/9877032?hl=en)
- Bookmaker list: [The Odds API bookmakers](https://the-odds-api.com/sports-odds-data/bookmaker-apis.html)
- Programme changes: Betfair closure ([iGaming Expert](https://igamingexpert.com/regions/europe/betfairs-uk-irish-affiliate-programme-exit/), [Yogonet](https://www.yogonet.com/international/news/2025/05/28/106152-betfair-to-end-uk-and-ireland-affiliate-programme)); Sky Bet Affiliate Hub closure ([iGB](https://igamingbusiness.com/strategy/sky-betting-and-gaming-to-halt-uk-affiliate-programme/)); evoke takeover ([Northeast Times](https://northeasttimes.com/2026/09/18/bally-s-intralot-shareholders-back-243m-purchase-of-william-hill-owner-evoke/))
- Programmes: [bet365 Partners T&Cs](https://www.bet365partners.com/en/termsandconditions), [bet365 guidelines](https://www.bet365partners.com/en/partnerguidelines), [Paddy Power Affiliates](https://partnerships.paddypower.com/index.html), [William Hill UK marketing guidelines](https://affiliates.williamhill.com/uk-marketing-guidelines.html), [Entain UK & ROI Marketing Guidelines](https://www.entainpartners.com/files/Marketing_Guidelines.pdf), [Entain partner T&Cs](https://www.entainpartners.com/gvcLegal.do), [Betfred compliance](https://www.betfredaffiliates.com/compliance), [Betfred T&Cs](https://www.betfredaffiliates.com/terms-and-conditions), [Super Partners (Betway)](https://www.superpartners.com/), [BVGroup UK guidelines (BetVictor, Betano)](https://bvgroupaffiliates.com/advertising-guidelines-uk/), [FDJ United Affiliates UK (Unibet)](https://www.fdjunitedaffiliates.com/markets/uk/), [LeoVegas UK affiliate limits](https://igamingbusiness.com/legal-compliance/leovegas-to-limit-affiliate-numbers-in-uk/), [Casumo marketing guidelines](https://casumopartners.com/marketing-guidelines/), [Rank Affiliates: Grosvenor](https://www.rankaffiliates.com/who-we-are/grosvenor-casino/), [LivePartners UK guidelines](https://www.livepartners.co.uk/affiliate-advertising-guidelines-uk.html), [BoyleSports code of conduct](https://affiliates.boylesports.com/affiliate-code-of-conduct/)

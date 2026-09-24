# Research log: affiliate disclosure requirements

| Field | Value |
|-------|-------|
| **Status** | Verified (second pass). Open items: Paddy Power / Sky Bet / Super Partners / LeoVegas programme status, bet365 partner guidelines (JS page) (§4) |
| **Feeds** | [affiliate-disclosures.md](./affiliate-disclosures.md) §1, §4, §5 |
| **First pass** | 24 September 2026 (cloud session, search summaries only) |
| **Second pass** | 24 September 2026 (local session, primary sources read) |

This log records what the research found, how sure it is, and what's still open. The spec holds the conclusions. This file holds the evidence and the gaps.

---

## How to run the next pass

1. Work through **§4 Still open**.
2. For every claim you touch in **§2**, record the result as **Confirmed** (quote plus URL), **Corrected** (what's actually true), or **Still unverified**.
3. Update [affiliate-disclosures.md](./affiliate-disclosures.md) §1, §4 and §5 to match, then this log's status.
4. Don't change app code in a research pass. The signpost URL change (spec §1, finding 1) is a separate code task.

---

## 1. Limits

- **First pass:** `WebFetch` was blocked for every domain, so every finding came from search-result summaries. Several were wrong (R1, R10, R11, the Betfred id).
- **Second pass:** primary pages and PDFs were read directly (curl + text extraction). Still blocked:
  - SBC News (403) and SCCG (410). Not needed; primary sources used instead.
  - `partnerships.paddypower.com` (JS-only page; blocked in the in-app browser too).
  - bet365's partner guidelines page (JS-rendered). Its terms page was read.
  - `leovegasaffiliates.com` and `superpartners.com` (JS-heavy). Not analysed.
- **Programme terms are gated.** Offer terms, creative packs and exact footer wording are only given to approved partners. Collect the rest on approval.

---

## 2. Findings

Result key: **Confirmed**, **Corrected**, **Still unverified**.

### Regulatory baseline

| # | First-pass claim | Result | Evidence |
|---|------------------|--------|----------|
| R1 | GambleAware closed 31 March 2026; BeGambleAware is no longer the default sign-off | **Corrected.** The charity's work moved to government, but **the website and brand continue under the Department of Health and Social Care.** begambleaware.org 301-redirects to gambleaware.org. The site says it is "operated by the Department of Health and Social Care". The branding page still asks gambling communications to carry the GambleAware logo with "Advice \| Tools \| Support" and a link to the site; logo requests go to a dhsc.gov.uk address. Its get-help page lists the National Gambling Helpline (GamCare) 0808 8020 133 for England and Scotland, the NHS Wales helpline 0808 2819 265, and Samaritans 116 123 | [gambleaware.org/privacy-notice](https://www.gambleaware.org/privacy-notice/), [/terms-and-conditions](https://www.gambleaware.org/terms-and-conditions/), [/branding-logos](https://www.gambleaware.org/branding-logos/), [/get-help-now](https://www.gambleaware.org/get-help-now/) |
| R2 | The replacement signpost is unclear | **Corrected.** Not unclear: the IGRG code (Feb 2026) accepts **either** GamCare or GambleAware (para 27). Every programme read (William Hill, Entain, Betfred, BoyleSports, BV Group, LivePartners, Casumo) still names BeGambleAware / GambleAware.org. GamCare still runs the helpline | IGRG para 27 (R10); programme pages (§3) |
| R3 | CAP 2.1: affiliate links must be obviously identifiable; "Ad" recommended; "affiliate" alone insufficient | **Confirmed, plus a new point.** Commercial nature must be clear "prior to engagement"; "placing an identifier such as '(Ad)' before parts of the content… is likely to be acceptable". "\*affiliate" alone was not enough (Asos, 22 Apr 2020). **New:** a generic disclaimer that the author "may" receive commission is unlikely to be acceptable (MailOnline, 21 Dec 2022). Our shipped copy says "We may earn commission", so it needs rewording | [ASA: Online affiliate marketing](https://www.asa.org.uk/advice-online/affiliate-marketing.html) (22 Mar 2023) |
| R4 | Significant conditions prominently with the offer; other T&Cs one click away | **Confirmed.** CAP 8.17: significant conditions (eligibility, deposit/wagering, time limits, minimum odds or bet types) must be clear and up front. Full T&Cs "usually one click away" and not hidden in footers or small print. Don't call an offer "free" if the customer must risk their own money | [ASA: Free bets and bonuses](https://www.asa.org.uk/advice-online/gambling-betting-and-gaming-free-bets-and-bonuses.html) (11 Sep 2025) |
| R5 | UKGC bonus rules from 19 Jan 2026: wagering ≤ 10x; mixed-product offers banned | **Confirmed.** SR code 5.1.1 paragraphs 3a (wagering capped at 10x) and 3b (no mixed-product promotions). The ban doesn't apply where the customer freely chooses which product to use the bonus on. The LCCP upcoming-changes page says "There are no upcoming LCCP changes" (updated 29 Jul 2026). Separately, the April 2026 LCCP update made LC 7.1.1 cite the DMCC Act 2024 | [UKGC: Gambling promotions to be safer and simpler](https://www.gamblingcommission.gov.uk/news/article/gambling-promotions-to-be-safer-and-simpler), [LCCP upcoming changes](https://www.gamblingcommission.gov.uk/licensees-and-businesses/page/lccp-upcoming-changes), [LCCP previous changes](https://www.gamblingcommission.gov.uk/licensees-and-businesses/page/lccp-previous-changes) |
| R6 | "Five material terms" rule for bonus ads | **Still unverified; almost certainly not a rule.** Nothing on the UKGC pages read. Not used in the spec | — |
| R7 | Operators are responsible for affiliates (SR code 1.1.2) | **Confirmed.** SR code 1.1.2 "requires you to take responsibility for third parties". Operators are "primarily responsible" for affiliates' direct-marketing breaches (email/SMS), especially to self-excluded people, including expired self-exclusions | [UKGC: Affiliates or third parties](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/affiliates-or-third-parties) (updated 8 Aug 2025) |
| R8 | CAP 16.3.12 strong appeal; enforcement notice with monitoring from 11 June 2026 | **Confirmed.** Notice dated 4 June 2026: "We will begin actively monitoring from 11 June 2026" | [ASA enforcement notice](https://www.asa.org.uk/resource/enforcement-notice-gambling-ads-with-strong-appeal-to-under-18s.html) |
| R9 | 25% rule for age-restricted ads | **Confirmed (not re-read; long-standing CAP rule).** IGRG para 51 goes further for paid digital prospecting: target 25+ | IGRG 2026 |
| R10 | IGRG 7th edition is latest; an 8th may exist | **Corrected.** Latest is **"7th Edition (Updated), February 2026"**; there is no 8th. Para 27: reference "GamCare /GambleAware or… www.gamcare.org.uk or www.gambleaware.org". Para 45: 18+. Para 46: banner landing pages link on to gamcare.org.uk or gambleaware.org. Para 51: 25+ targeting for paid digital prospecting. **Para 58 (affiliates): "all relevant affiliate ads should be clearly and prominently marked '#ad'"**; affiliates must share safer-gambling content regularly, pass due-diligence/PEPs/sanctions checks, and sign a code of conduct ("one strike and you're out") | [IGRG code, Feb 2026](https://bettingandgamingcouncil.com/uploads/IGRG_2026-03-03-133712_dwft.pdf) |
| R11 | DMCC: undisclosed paid ranking is a banned practice | **Corrected.** CMA207 (18 Nov 2025, 64 pp.) has no banned practice or rule on ranking ("rank" returns no hits). The UK did not adopt the EU's paid-ranking rule. What applies: **banned practice 12** (paid editorial content not made clear, e.g. "#Ad"); failing to identify commercial intent (para 6.8); comparison sites are responsible for their own invitations to purchase (para 4.13). A ranking disclosure is still good practice (avoids a misleading omission) but isn't a named ban | [CMA207](https://assets.publishing.service.gov.uk/media/691b9bd821ef5aaa6543ee6f/Unfair_commercial_practices_CMA207_18_Nov_2025__2_.pdf) |

### Programme status and terms

| # | Programme | Result | Evidence |
|---|-----------|--------|----------|
| P1 | Betfair UK & I closed 1 Jul 2025 | **Confirmed.** PokerStars UK also closed | [iGaming Expert](https://igamingexpert.com/regions/europe/betfairs-uk-irish-affiliate-programme-exit/), [Yogonet](https://www.yogonet.com/international/news/2025/05/28/106152-betfair-to-end-uk-and-ireland-affiliate-programme), [Poker Industry News](https://pokerindustrynews.com/poker-news/pokerstars-axes-uk-affiliate-program-no-future-payouts/) |
| P2 | Paddy Power open | **Still unverified.** Page is JS-only and blocked. No closure news found, but Flutter is cutting UK costs (Betfair, PokerStars, up to 100 Paddy Power shops under review Sept 2026) | [Yogonet, 3 Sep 2026](https://www.yogonet.com/international/news/2026/09/03/126213-up-to-100-paddy-power-shops-could-face-closure-under-flutter-review) |
| P3 | Sky Bet "Affiliate Hub" open | **Corrected / still unverified.** The Affiliate Hub **closed in 2017**. A later "Skybet Partners" programme appears only on third-party sites; current status unknown | [iGB](https://igamingbusiness.com/strategy/sky-betting-and-gaming-to-halt-uk-affiliate-programme/), [Gambling Insider](https://www.gamblinginsider.com/news/4062/sky-betting-gaming-to-end-affiliate-marketing-program) |
| P4 | bet365 | **Partly confirmed (terms).** No direct marketing (email, SMS, push notifications, targeted pop-ups) without written consent; never to self-excluded people. Links only on "websites or applications… identified in your partner programme application" → list the web app **and** both mobile apps. Guidelines page not read (JS) | [bet365 Partners T&Cs](https://www.bet365partners.com/en/termsandconditions) |
| P5 | William Hill / 888 (evoke) | **Confirmed + expanded.** UK Marketing Guidelines: "Include 18+, BeGambleAware, and #ad in all adverts"; key qualifying criteria with the offer; full T&Cs one click away. Social: 75% of audience 18+, target 25+; nobody under 25 in imagery; no Premier League footballers. No SMS, WhatsApp, email, post **or push notifications** to own or bought databases. **Stability:** Bally's Intralot is buying evoke (£243m; both sets of shareholders approved; completion expected Q4 2026–Q1 2027) | [William Hill UK guidelines](https://affiliates.williamhill.com/uk-marketing-guidelines.html), [Northeast Times, 18 Sep 2026](https://northeasttimes.com/2026/09/18/bally-s-intralot-shareholders-back-243m-purchase-of-william-hill-owner-evoke/) |
| P6 | Ladbrokes / Coral (Entain) | **Confirmed + expanded.** UK & ROI Marketing Guidelines V1.0: footer "18+ \| begambleaware.org \| Gamble responsibly"; significant terms with the headline and **before the CTA**. The definition of Affiliate Site includes mobile apps. Appendix 1 covers Northern Ireland (A11) | [Entain Marketing Guidelines PDF](https://www.entainpartners.com/files/Marketing_Guidelines.pdf) |
| P7 | Betfred | **Confirmed + expanded.** 18+ disclaimer and "a link to a responsible gambling body (e.g. www.gambleaware.org/)"; #AD on social posts; IGRG + CAP 16; regular safer-gambling content. No incentivised traffic; no email/SMS/phone/post marketing; no promotion via Snapchat, WhatsApp, Telegram, YouTube or Twitch; no "advertorial" style. **Odds API id is `betfred_uk`, not `betfred`** | [Betfred compliance](https://www.betfredaffiliates.com/compliance), [Betfred T&Cs](https://www.betfredaffiliates.com/terms-and-conditions) |
| P8 | Betway | **Still unverified for UK.** UK affiliates now go through Super Group's **Super Partners** (superpartners.com); page not analysed | superpartners.com |
| P9 | BetVictor | **Confirmed + expanded.** Programme moved to **BVGroup Affiliates**, which also runs **Betano UK** and talkSPORT BET. UK guidelines: every advert includes "GambleAware.org", "18+", "T&C apply"; say "New Customers" or "Existing Customers"; significant terms (wagering, deposit, withdrawal limits, start/end dates) on the advert; full T&Cs ≤ 1 click; social pages age-gated 18+; nobody who looks under 25; approved on-brand creative only, or account closure and withheld commission | [BVGroup UK guidelines](https://bvgroupaffiliates.com/advertising-guidelines-uk/), [BVGroup Affiliates](https://bvgroupaffiliates.com/) |
| P10 | Unibet (Kindred) | **Confirmed + expanded.** kindredaffiliates.com redirects to **FDJ United Affiliates**. "All Content displayed on Affiliate Sites should be clearly and prominently marked '#ad'"; significant terms in the promotion body; no SMS through third parties. Live streaming: no pure-streaming ads, must say "funded account required", never "free". Unibet offers say "New GB customers only". A multiproduct offer (sports + casino spins) was listed, so watch the mixed-product rule | [FDJ United Affiliates UK](https://www.fdjunitedaffiliates.com/markets/uk/) |
| P11 | LeoVegas (+ BetMGM, BetUK) | **Still unverified (current intake).** Site is JS-heavy. BetMGM and BetUK are **not in The Odds API**, so they don't need register rows | [The Odds API bookmakers](https://the-odds-api.com/sports-odds-data/bookmaker-apis.html) |
| P12 | Casumo | **Confirmed + expanded.** All ads show 18+ and a help-organisation contact (lists BeGambleAware). No SMS, email, social, native or direct marketing without approval. No "free" / "risk free" misuse. Advertorials need approval | [Casumo marketing guidelines](https://casumopartners.com/marketing-guidelines/) |
| P13 | Grosvenor (Rank) | **Corrected.** Rank Affiliates does cover **Grosvenor Sport** (Kambi platform). Its listed sports welcome offer was "Bet £20 on Sports and get a £20 Casino Bonus": a mixed-product offer of the kind SR 5.1.1(3b) bans. The page may be stale, but never surface Grosvenor offers without checking | [Rank Affiliates: Grosvenor](https://www.rankaffiliates.com/who-we-are/grosvenor-casino/) |
| P14 | LiveScore Bet / Virgin Bet | **Confirmed + expanded.** Significant conditions shown prominently; include "Begambleaware.org", "18+" and "T&C apply"; remove self-excluded customers from marketing databases | [LivePartners UK guidelines](https://www.livepartners.co.uk/affiliate-advertising-guidelines-uk.html) |
| P15 | BoyleSports | **Confirmed + expanded.** Mark ads #ad / "AD"; 18+; signpost GambleAware.org for the UK; a social-responsibility message. Social content age-gated 25+; nobody under 25 in marketing. No SMS or email without consent. Quarterly safer-gambling content. State that communications are made without BoyleSports' involvement | [BoyleSports code of conduct](https://affiliates.boylesports.com/affiliate-code-of-conduct/) |
| P16 | Betano UK (new) | **Confirmed.** In The Odds API as `betano_uk`. Operated by BV Gaming Ltd; affiliate programme via BVGroup Affiliates (P9) | [BVGroup Affiliates](https://bvgroupaffiliates.com/) |

---

## 3. Actions: results

| # | Action | Result |
|---|--------|--------|
| A1 | Post-GambleAware signpost | **Done.** R1/R2 corrected. Keep GambleAware, change the URL to `https://www.gambleaware.org`, keep the helpline. GamCare is an equally valid alternative under IGRG |
| A2 | Bookmakers in our tables | **Done.** The Odds API `uk` region: sport888, betano_uk, betfair_ex_uk, betfair_sb_uk, betfred_uk, betvictor, betway, boylesports, casumo, coral, grosvenor, ladbrokes_uk, leovegas, livescorebet, matchbook, paddypower, skybet, smarkets, unibet_uk, virginbet, williamhill. Not in it: bet365 (only via the unbuilt API-Football depth feed), BetMGM, BetUK. Side note: `BOOKMAKER_DOMAINS` has no `betfred_uk` or `betano_uk` entry, so their favicons are guessed |
| A3 | ASA guidance | **Done.** R3, R4 confirmed; new point on "may earn commission" |
| A4 | UKGC pages | **Done.** R5, R7 confirmed; R6 not found |
| A5 | IGRG edition | **Done.** R10 corrected (Feb 2026 update of the 7th edition; '#ad' for affiliates) |
| A6 | CMA207 | **Done.** R11 corrected |
| A7 | Programme terms | **Mostly done** (P4–P16). Open: bet365 guidelines page, Super Partners (Betway), LeoVegas, Paddy Power |
| A8 | Paddy Power / Sky Bet | **Partly done.** Sky Bet's Affiliate Hub closed in 2017; Paddy Power unknown. Needs a manual check (§4) |
| A9 | Programme stability | **Done.** evoke → Bally's Intralot (completion Q4 2026–Q1 2027): expect William Hill/888 programme changes. Kindred → FDJ United: UK programme continues under the new name |
| A10 | App stores | **Done; serious Google Play risk found.** See below |
| A11 | Northern Ireland | **Done.** Entain's guidelines (Appendix 1): the NI Betting, Gaming, Lotteries and Amusements Order 1985 makes it an offence to invite the public to subscribe money to be used in gaming, so casino promotion into NI is risky; ASA says "Specialist legal advice should be sought". Unibet offers are "New GB customers only". **Recommendation: show Join buttons to GB users only** unless a programme confirms NI |
| A12 | GAMSTOP / self-exclusion | **Done.** UKGC holds operators "primarily responsible" for affiliates' direct marketing to self-excluded people (R7). bet365 and LivePartners require suppressing self-excluded people. Our *Hide bookmaker offers* opt-out is reasonable; the stronger rule is **no direct marketing (push, email, SMS, chat) with partner links at all** |
| A13 | Recent ASA rulings | **Done.** Smart Gravity Ltd (upheld, 9 Sep 2026): an affiliate's paid search ad showed for "help with gambling"; negative keywords weren't a "sufficiently robust safeguard" (CAP 1.3). Dribble Media t/a Midnite (upheld, 12 Aug 2026): TikTok ad featuring someone who looked under 25. Lesson: never show partner prompts on RG/help pages or next to help content. Sources: [SBC News](https://sbcnews.co.uk/affiliatenews/2026/09/10/asa/), [Gaming.net](https://www.gaming.net/asa-rules-against-smart-gravity-over-gambling-help-search-ad/), [ASA: Dribble Media](https://www.asa.org.uk/rulings/dribble-media-ltd-g25-1300959-dribble-media-ltd.html) |

### A10 detail: app stores

- **Apple.** Guideline 5.3.4: real-money gaming apps "must have necessary licensing and permissions in the locations where the app is used, must be geo-restricted to those locations, and must be free". Nothing specific on apps that link out to bookmakers. Also 5.1.1(ix): apps in regulated fields including gambling "should be submitted by a legal entity that provides the services, and not by an individual developer". `docs/app-store/compliance-statement.md` already argues that linking to licensed operators isn't a licensable activity; add a line on affiliate Join buttons before they ship to iOS. Source: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- **Google Play: high risk, and it affects the app as it stands today, not just the Join button.** The *Real-Money Gambling, Games, and Contests* policy:
  - Generally bans apps that "enable or facilitate" real-money gambling unless the developer completes Play's gambling-app application as a licensed operator.
  - An app may show gambling ads only if, among other things, it does "not provide… companion functionality (for example, functionality that assists with wagering, payouts, sports score/odds/performance tracking…)" and its content does "not promote or direct users to gambling".
  - Listed violation: "A dedicated sports odds tracker app containing integrated gambling ads linking to a sports betting site".

  The Android app already shows bookmaker odds and **Open** links to bookmaker betslips. Partner Join buttons would make it plainly promotional. Source: [Play Console Help: Real-Money Gambling](https://support.google.com/googleplay/android-developer/answer/9877032?hl=en).

  **Decision (24 Sep 2026):** no Play Store release; Android users use the website. Recorded in the spec's open questions and `apps/mobile/ANDROID_LAUNCH.md`.

---

## 4. Still open

- **Paddy Power and Sky Bet programme status.** Check by hand in a normal browser: partnerships.paddypower.com, and search for "Sky Bet Partners" / Flutter UKI affiliate programme.
- **Super Partners (Betway UK) and LeoVegas UK intake.** JS-heavy sites; read in a normal browser.
- **bet365 partner guidelines** (bet365partners.com/en/partnerguidelines, JS-rendered).
- **Apple developer account type.** If Tiki Acca is on an individual account, 5.1.1(ix) says gambling-adjacent apps "should be submitted by a legal entity".

---

## 5. Suggested prompt for the next session

> Read `docs/specs/affiliate-disclosures-research.md` and `docs/specs/affiliate-disclosures.md`. Work through §4 Still open using a normal browser. Record results in §2 of the log, then update the spec's §1, §4 and §5. Docs only, no app code changes.

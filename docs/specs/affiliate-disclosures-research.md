# Research log: affiliate disclosure requirements

| Field | Value |
|-------|-------|
| **Status** | Open. Needs a verification pass with full web access |
| **Feeds** | [affiliate-disclosures.md](./affiliate-disclosures.md) §1, §4, §5 |
| **First pass** | 24 September 2026 |

This log records what the first research pass found, how sure it is, and what it could not do. The spec holds the conclusions. This file holds the evidence and the gaps.

---

## How to run the next pass

1. Work through **§3 Actions not taken**, in priority order. Each item names the URL or search to try and the question to answer.
2. For every claim in **§2**, record the result as **Confirmed** (quote plus URL), **Corrected** (what's actually true), or **Still unverified**.
3. Update [affiliate-disclosures.md](./affiliate-disclosures.md) with anything confirmed or corrected: §1 findings, §4 universal requirements (U1–U11), §5 per-bookmaker register. Then update this log's status.
4. Don't change app code in the research pass. The BeGambleAware swap (spec §1, finding 1) is a separate code task once the replacement signpost is confirmed.

---

## 1. Limits of the first pass

- **No page reads.** The session's network policy blocked `WebFetch` for every domain tried: the-odds-api.com, gambleaware.org, asa.org.uk, bet365partners.com, entainpartners.com, casinonewsdaily.com and sbcnews.co.uk. Every finding below comes from **search-result summaries**, not from reading the source page.
- **Mixed source quality.** Some summaries were drawn from official pages (ASA, UKGC, the programmes' own sites). Others came from third-party affiliate-review sites (StatsDrone, 15M, AskGamblers, Algo Affiliates, Post Affiliate Pro, Geeky Gambler). Treat the second group as leads, not facts.
- **Programme terms are gated.** Offer terms, creative packs and exact footer wording are only given to approved partners. Public pages won't have everything; the rest has to be collected on approval.

---

## 2. Findings and confidence

**High:** several independent sources agree, including official ones. **Medium:** one reasonable source or official-looking summary only. **Low:** third-party review sites only, or inferred.

### Regulatory baseline

| # | Finding | Confidence | Verify against |
|---|---------|-----------|----------------|
| R1 | GambleAware closed on **31 March 2026**. Funding moved to the statutory levy and NHS / public-health commissioners in England, Scotland and Wales. The BeGambleAware brand is no longer the default sign-off | High (CasinoBeats, Gambling Insider, NEXT.io, SBC News headline) | gambleaware.org branding page; gov.uk levy announcements |
| R2 | **What replaces BeGambleAware as the signpost is unclear.** One stakeholder quoted at closure: "We don't know who to signpost to." GamCare still runs the National Gambling Helpline, 0808 8020 133, 24/7 (GamCare post, 2026) | Medium | UKGC, BGC and GamCare guidance issued after April 2026 (§3 A1) |
| R3 | CAP rule 2.1: affiliate links must be **obviously identifiable** as ads. "Ad" is recommended; "affiliate" alone is unlikely to be enough | High (ASA affiliate-marketing guidance, via summary) | asa.org.uk/advice-online/affiliate-marketing.html |
| R4 | Significant conditions must be **prominently displayed with** an advertised offer. Other T&Cs may be at most one click away. For gambling these include restricted odds, eligibility limits, and deposit, wagering and withdrawal requirements | High (ASA free-bets guidance) | asa.org.uk free bets and bonuses page + CAP/BCAP help note |
| R5 | UKGC bonus rules from **19 January 2026**: wagering capped at 10x; mixed-product promotions banned (e.g. a sports bet that unlocks casino spins) | Medium (igaming.com, Aff Rate and others; UKGC page not read) | UKGC "LCCP upcoming changes" page |
| R6 | A "five material terms" rule for bonus ads (wagering, max bet, eligible games, expiry, max cashout) | **Low.** Only in Geeky Gambler / Track360 summaries. **Not used in the spec** | UKGC LCCP; likely casino-specific or overstated |
| R7 | The UKGC holds operators responsible for their affiliates' marketing (SR code 1.1.2) | High | UKGC "Affiliates or third parties" page |
| R8 | CAP 16.3.12 (since 1 Oct 2022): no **strong appeal** to under-18s. Top-flight footballers are high risk. The ASA treated Oddschecker content as ads. ASA enforcement notice with active monitoring from **11 June 2026** | High (ASA pages, LexisNexis) | ASA enforcement notice |
| R9 | 25% rule: no age-restricted ads in media where under-18s are over 25% of the audience | High | CAP age-restricted ads guidance |
| R10 | IGRG industry code, **7th edition**, is the latest found: 18+ in ad copy; safer-gambling messaging; 20% of advertising on safer gambling | Medium. **An 8th edition may exist after GambleAware's closure** | BGC site (§3 A5) |
| R11 | The DMCC Act consumer regime is in force from **6 April 2025**. Comparison sites must be clear about how they make money and how they order results. Undisclosed paid ranking is one of the banned practices | Medium (CMA summaries; CMA207 not read) | CMA207 (§3 A6) |

### Programme status and terms

| # | Programme | Finding | Confidence |
|---|-----------|---------|-----------|
| P1 | Betfair | UK & Ireland affiliate programme ended **1 July 2025**. PokerStars UK followed | High (SBC News, Yogonet, iGaming Expert) |
| P2 | Paddy Power | Programme open; approval takes 1–2 weeks | Low (third-party pages) |
| P3 | Sky Bet | "Affiliate Hub": up to 35% revenue share, no negative carryover | Low (third-party pages; the Flutter UK retreat makes this worth checking) |
| P4 | bet365 | Never target under-18s. No SMS, WhatsApp or Telegram as the main traffic source. No blind or programmatic traffic. Compliance-monitoring tools on partner content | Medium (Track360 summary plus bet365partners.com in results) |
| P5 | William Hill / 888 (evoke) | William Hill Affiliates publishes UK Marketing Guidelines. Content not read. evoke published a 2026 "change of control notice" | Medium (existence); contents unknown |
| P6 | Ladbrokes / Coral (Entain) | UK & ROI Marketing Guidelines PDF exists: "clear, transparent… plain and intelligible" terms. Influencers 25+ with prior approval. Documents due within 30 days | Medium |
| P7 | Betfred | Must include an RG link and 18+ signage (terms name gambleaware.org). IGRG + CAP 16. No incentivised traffic. Licence account 39544 | Medium (betfredaffiliates.com in results) |
| P8 | Betway | Don't portray excessive gambling. Records kept 2 years. **Source was the Italian site (betwaypartners.it)** | Low for UK |
| P9 | BetVictor | Significant-terms disclaimer on offer banners. Full T&Cs ≤ 1 click. On-brand creative, or account closure. Safer-gambling social posts | Medium (betvictor.com compliance page in results) |
| P10 | Unibet (Kindred / FDJ United) | No "free" for live streaming; no pure-streaming ads | Medium |
| P11 | LeoVegas (+ BetMGM UK, BetUK) | Limits UK affiliates to a small number. Past UKGC penalty (£627k) included 23 affiliate ads missing significant terms | High (2021–22 news), current status unknown |
| P12 | Casumo | All ads show the age limit and a help-organisation contact. No child-appealing content | Medium (Casumo guidelines page in results) |
| P13 | Grosvenor (Rank Affiliates) | Casino-focused; 25–35% revenue share. **Sports coverage unknown** | Low |
| P14 | LiveScore Bet / Virgin Bet (LivePartners) | UK guidelines: significant conditions with the offer, T&Cs ≤ 1 click, free-bet commitments in the ad itself | Medium (livepartners.co.uk in results) |
| P15 | BoyleSports | Social content age-gated to 25+; nobody under 25 in marketing; 24h cookie; UKGC account 39469 | Medium |

---

## 3. Actions not taken

In priority order. All were blocked by `WebFetch` egress limits unless stated otherwise.

### Must do before launch

- **A1. Confirm the post-GambleAware signpost.**
  - Wanted to read: gambleaware.org/for-professionals/using-gambleaware-logo; SBC News "GambleAware closes on legacy…" (31 Mar 2026); casinonewsdaily.com "UK shuts GambleAware as new levy system begins" (6 Apr 2026).
  - Also search: UKGC or BGC guidance after April 2026 on safer-gambling signposting; whether begambleaware.org redirects anywhere; whether NHS or the new commissioners run a public site operators should link to; whether GamCare has issued signposting guidance.
  - Question: what should our disclosure link to instead of BeGambleAware.org, and is logo use still expected anywhere?
  - Decides: the code fix in spec §1 finding 1 and U3.
- **A2. Confirm which bookmakers are in our tables.**
  - Wanted to read: the-odds-api.com/sports-odds-data/bookmaker-apis.html (the `uk` region list).
  - Alternative that needs no web access: check `/admin/odds` diagnostics in production, or call The Odds API `/v4/sports/soccer_epl/odds?regions=uk` with our key and list `bookmakers[].key`.
  - Decides: the spec §5 rows. The register assumed the ids in `BOOKMAKER_DOMAINS` and the mock provider.
- **A3. Read the ASA's affiliate marketing guidance** (asa.org.uk/advice-online/affiliate-marketing.html) and the gambling free-bets guidance. Capture the exact wording on labels ("Ad", "#ad") and on significant conditions. Decides: U1, U4 and the `AD` tag wording.
- **A4. Read the UKGC pages:** "Affiliates or third parties" and "LCCP upcoming changes". Confirm the 19 January 2026 bonus rules (R5), whether R6 is real, and any 2026 changes about affiliates or signposting.

### Should do

- **A5. IGRG code edition.** Search the BGC site for an 8th edition (2025–26) and its safer-gambling message and signposting rules. The 7th edition references BeGambleAware.
- **A6. CMA207 (Nov 2025).** Read the sections on comparison sites and ranking to confirm what the table disclosure line must say (U6).
- **A7. Programme terms, one by one.** Record anything beyond U1–U11 in spec §5:
  - bet365partners.com/en/partnerguidelines and /en/termsandconditions
  - partnerships.paddypower.com (+ FAQ)
  - Sky Bet Affiliate Hub (find the current URL)
  - affiliates.williamhill.com/uk-marketing-guidelines.html, and 888's affiliate programme (evoke)
  - entainpartners.com/files/Marketing_Guidelines.pdf and /gvcLegal.do
  - betfredaffiliates.com/compliance and /terms-and-conditions: does it still name gambleaware.org?
  - Betway Partners **UK** terms (the first pass only found the Italian site)
  - betvictor.com/lp/affiliates-advertising-promotion-compliance-regulation
  - kindredaffiliates.com/markets/uk/
  - LeoVegas Affiliates (also BetMGM UK, BetUK): current UK intake policy
  - casumopartners.com/marketing-guidelines/
  - rankaffiliates.com: is Grosvenor Sport covered?
  - livepartners.co.uk/affiliate-advertising-guidelines-uk.html (LiveScore Bet, Virgin Bet)
  - affiliates.boylesports.com/affiliate-code-of-conduct/
- **A8. Are Paddy Power and Sky Bet still taking UK affiliates in 2026?** Flutter closed Betfair's and PokerStars' UK programmes. Search for a 2026 closure or consolidation notice.
- **A9. Programme stability.** evoke's 2026 change-of-control notice (William Hill, 888): any programme change? Kindred to FDJ United: is the UK affiliate programme continuing?

### Not researched at all

- **A10. App store rules for affiliate gambling links.**
  - Apple Guideline 5.3: read the current text on apps that link out to licensed bookmakers. Update `docs/app-store/compliance-statement.md`.
  - **Google Play's real-money gambling policy:** does an app that links to or promotes UK bookmakers need Play's gambling-app approval? This is new ground and could block Android.
- **A11. Northern Ireland.** The Gambling Act 2005 covers Great Britain only. Check whether showing Join buttons to NI users raises separate issues (UKGC licensees usually accept NI customers).
- **A12. GAMSTOP and affiliates.** Is there any guidance expecting affiliates to suppress marketing to self-excluded users, beyond the opt-out switch the spec proposes?
- **A13. Welcome-offer mechanics (Phase 2).** Current ASA rulings on free-bet significant terms in odds-comparison contexts, e.g. rulings against Oddschecker or other comparison sites.

---

## 4. Suggested prompt for the next session

> Read `docs/specs/affiliate-disclosures-research.md` and `docs/specs/affiliate-disclosures.md`. Work through §3 Actions not taken in priority order using web search and page reads. For each §2 finding, mark it Confirmed (quote + URL), Corrected, or Still unverified in this log. Then update the spec's §1, §4 and §5 to match. Docs only, no app code changes.

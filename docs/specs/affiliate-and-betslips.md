# Spec: Affiliate links & betslip deeplinks

| Field | Value |
|-------|-------|
| **Status** | Backlog (July 2026) |
| **Depends on** | Live odds + betslip deeplinks (shipped) |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

---

## Goals

1. **Affiliate revenue** — earn CPA / rev share when users place bets via our links, without becoming a bookmaker.
2. **Better betslip UX** — links that land users closer to a ready-to-place acca, not generic football hubs.
3. **Stay compliant** — clear disclosure, 18+, responsible gambling; UK CAP/ASA affiliate rules.

**Out of scope (for now):** paid subscriptions — core syndicate loop stays free; no Pro tier planned until a clear paid value prop emerges.

---

## As-built today

| Area | Current behaviour |
|------|-------------------|
| Deeplink source | The Odds API `includeLinks` on outcomes + bookmaker event links |
| Storage | `Leg.betslipUrl`, `Leg.bookmakerLinks` JSON at lock; `Round.accaBookmakerRankings` |
| Builder | `apps/web/src/lib/odds/betslip-links.ts` — per-leg links, ranked acca bookmakers |
| Fallback | Static `BOOKMAKER_HUB_URLS` when API omits a link |
| Gaps | Cross-bookmaker accas often have no single acca deeplink; ranked acca URL uses first leg link only; hub fallbacks are not selection-specific |

---

## Phase A — Affiliate tracking

- [ ] Join UK bookmaker affiliate programmes (prioritise bookmakers already in Odds API feed: Bet365, Paddy Power, William Hill, Sky Bet, etc.)
- [ ] Env config for affiliate IDs / tracking templates per bookmaker (e.g. `AFFILIATE_BET365_TAG`)
- [ ] Append tracking params to outbound deeplinks in `betslip-links.ts` (and lock-time stored URLs where appropriate)
- [ ] UI disclosure: footer + near betslip CTA (“We may earn commission if you sign up or bet via these links”)
- [ ] Ensure `/about` and marketing copy remain accurate (not a bookmaker; affiliate relationship stated)
- [ ] Admin metric (optional): outbound betslip clicks — `AnalyticsEvent` type or admin counter

**Compliance checklist (non-exhaustive):**

- [ ] 18+ messaging on pages with betslip CTAs
- [ ] Responsible gambling links (GamCare, BeGambleAware) near affiliate CTAs
- [ ] No guaranteed winnings / tipster language (align with [BRAND.md](../BRAND.md))

---

## Phase B — Better betslip deeplinks

- [ ] Audit link quality per bookmaker: selection-level vs event-level vs hub fallback (log or admin report)
- [ ] Prefer **acca-builder** URLs from Odds API where the ranked bookmaker quotes all legs (`hasAllLegLinks`)
- [ ] Investigate bookmaker-specific acca deep link patterns beyond first-leg URL
- [ ] Per-leg **Open** links: always use stored `bookmakerLinks[bookmakerId]` for the locked bookmaker, not only `betslipUrl`
- [ ] Reduce hub fallbacks — expand `BOOKMAKER_HUB_URLS` only as last resort; document known gaps
- [ ] Handle cross-competition accas: clear UX when user must place legs on separate bookmaker pages
- [ ] Re-fetch / refresh links at lock (already in `lockRoundWithAccaPricing`) — verify stale link edge cases

---

## Phase C — Measurement & iteration

- [ ] Track click-through on primary betslip + per-leg Open (privacy-conscious, no PII in URLs)
- [ ] Correlate with affiliate dashboard conversions (manual at first)
- [ ] Iterate bookmaker priority in `rankAccaBookmakers()` if affiliate terms differ materially

---

## Open questions

| Question | Notes |
|----------|-------|
| Store affiliate params on `Leg` at lock vs apply at click time? | Click-time avoids stale affiliate URL rules; lock-time matches frozen deeplink model |
| Odds API affiliate programme vs direct bookmaker deals? | Compare rev share; may use both |
| Email notifications include betslip link? | Useful for conversion; compliance review |

---

## Code map (planned touchpoints)

| Path | Change |
|------|--------|
| `apps/web/src/lib/odds/betslip-links.ts` | Affiliate param injection, acca URL logic |
| `apps/web/src/lib/odds/quotes.ts` | Deeplink resolution at quote time |
| `apps/web/src/lib/odds/lock-round.ts` | Lock-time link storage |
| `apps/web/.env.example` | Affiliate env vars |
| `apps/web/src/components/group-ui.tsx` | Disclosure copy near CTAs |
| `apps/web/src/components/marketing/` | Footer compliance links |

---

## Deferred

| Item | Reason |
|------|--------|
| **Paid subscriptions** | No compelling Pro feature set yet; core loop should stay free |

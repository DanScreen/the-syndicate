# Spec: Settle-day recap share card

| Field | Value |
|-------|-------|
| **Status** | Backlog — primary viral/invite loop |
| **Depends on** | Share card renderer (shipped — `render-performance-image.ts`), settlement (shipped) |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) — Stats (share-card.tsx) |

---

## Why

Every settled round is a story — who carried, who tanked, what the acca paid — and it ends inside a friend group that already has a WhatsApp chat. A branded, auto-generated recap image is a one-tap share into that chat: **every settled round becomes an invite ad** seen by exactly the people most likely to join. This is the cheapest acquisition channel available; the canvas renderer and share plumbing already exist.

## Goals

1. **Auto-generated recap image per settled round** — the acca, each member's leg + outcome, combined odds, group points, branded Turf Green.
2. **One-tap share** — native share sheet (mobile) / copy image + text (web), sized for WhatsApp/iMessage previews.
3. **Recap drives return traffic** — image carries the wordmark + `tikiacca.com`; share text carries the group invite link.
4. **Zero manual effort** — surfaced automatically on settle (Round tab, History rows, settle notification deep link).

**Non-goals (v1):** video/animated recaps, public recap web pages (image + link only), Instagram-story vertical variant (add later if wanted), monthly/season recap variants (see [seasons-and-public-leaderboards.md](./seasons-and-public-leaderboards.md) Phase 2/3).

---

## Card design (1200×630, brand shell)

Layout per outcome:

- **Acca won:** celebratory header "ACCA LANDED 🎉 {combinedOdds}", per-leg rows (name · selection · odds · ✅), group points, "won with {bookmaker}".
- **Acca lost:** wry header "SO CLOSE 💀" / "BUSTED", the killer leg highlighted, winners still shown with their per-leg points (the per-leg scoring rule is a differentiator — show it off).
- Footer: Tiki Acca wordmark + `tikiacca.com` + "Social Group Betting".

Member names: **first names only** on the card (it leaves the app). Reuse `pointsTone` conventions (green/red).

## Share text (accompanies the image)

```
{Group name} — Bet #{n} settled: {outcome summary}.
Think you'd have done better? Join our group: https://www.tikiacca.com/groups/join?code={code}
```

Invite link inclusion is **owner-controlled** (group setting, default on) — some groups won't want open invites; fall back to plain `tikiacca.com`.

## Surfaces

| Surface | Behaviour |
|---------|-----------|
| Round tab (just-settled teaser) | "Share the recap" button renders + opens share sheet / download |
| History tab | Share icon per settled round row |
| Settle notification | Deep link lands on the round with recap CTA visible |
| Mobile | `expo-sharing` native share sheet (image + text) |

## Implementation notes

- Extend `apps/web/src/lib/share/render-performance-image.ts` with a `renderRoundRecapImage(round)` variant; data comes from the existing group/history payloads (fixtures, selections, odds, outcomes, points) — no new queries.
- Client-side canvas render on demand (as today) — no server image generation or storage v1.
- Track shares: `AnalyticsEvent` type `recap_share` (+ `recap_share_invite` when the invite link variant is used) so we can measure the loop.
- Sign-up flow already supports `/groups/join?code=` — verify the landing experience for signed-out users hitting an invite link (join intent should survive sign-up; fix if it doesn't).

## Build phases

### Phase 1 — recap card
- [ ] `renderRoundRecapImage()` (won + lost layouts)
- [ ] Share CTA on Round settle teaser + History rows (web)
- [ ] Share text + owner toggle for invite link (group settings)
- [ ] `recap_share` analytics events

### Phase 2 — mobile + funnel polish
- [ ] Mobile share sheet (`expo-sharing`)
- [ ] Verify/fix join-intent persistence through sign-up from invite links
- [ ] Admin overview: shares + joins-from-share counters

## Open questions

| Question | Recommendation |
|----------|----------------|
| Auto-attach recap to settle email? | Phase 2 — email needs server-side rendering; start client-only |
| Show £ profit on card? | No — points only + odds; points-first is the brand and avoids gambling-ad tone |
| Per-member recap ("my leg won") variant? | Later — group recap first, it carries the invite |

## Related docs

[group-stats-and-points.md](./group-stats-and-points.md) · [seasons-and-public-leaderboards.md](./seasons-and-public-leaderboards.md) · [live-matchday.md](./live-matchday.md)

# App Store readiness — review & fix plan

_Date: 2026-07-18 · Reviewer: Claude Fable 5 · Goal: first-time approval for the iOS app_

Review of `apps/mobile` (plus the API surfaces it depends on) against Apple's App
Review Guidelines, with the extra scrutiny a betting-adjacent app attracts.

---

## Verdict

Two certain rejections (account deletion, UGC moderation), one managed risk
(gambling classification), and a handful of friction items. All fixable; plan below.

---

## Findings

### Certain rejections

| # | Finding | Guideline |
|---|---------|-----------|
| 1 | **No account deletion.** Account screen offers sign-out only; no deletion endpoint exists in the API. Mandatory for all apps with account creation since 2022, mechanically enforced. | 5.1.1(v) |
| 2 | **Group chat is UGC with no moderation controls.** Profanity filter exists, but there is no way to report a message, no way to block a user, and no published contact info. Social features missing these are rejected formulaically. | 1.2 |

### Managed risk — gambling classification

| # | Finding | Guideline |
|---|---------|-----------|
| 3 | The app **facilitates real-money betting** (live odds, acca building, bookmaker betslip deeplinks) without taking wagers. Cautious reviewers may probe 5.3.4 (licensing + geo-limits). Precedent exists (UK odds-comparison apps) but approval depends on positioning: 18+ age rating, UK-only availability, and review notes that pre-empt the licensing question. Fallback held in reserve: ship v1 without direct betslip deeplinks, reinstate in an update. | 5.3 |

### Friction items

| # | Finding | Guideline / surface |
|---|---------|---------------------|
| 4 | Login-gated app needs **working demo credentials** seeded with real-looking content (group, locked acca, results, chat, leaderboard). Reviewer is on a US IP — odds and links must not geo-break. | 2.1 App Completeness |
| 5 | **Push permission prompts automatically after sign-in** (`(main)/_layout.tsx` registers on every launch). Should only silently re-register when permission is already granted; the explicit opt-in button in Account is the request path. | 4.5.4 / HIG |
| 6 | **No Terms of Service** and no support contact in-app (Legal card links privacy + cookies only). 1.2 expects UGC terms + contact; App Store Connect requires a Support URL. | 1.2 / metadata |
| 7 | **App Privacy labels** must declare: email, name, DOB, user content (chat), usage data (first-party analytics) — linked to identity, **no tracking** (no ad SDKs; ATT not needed; do not declare tracking). | 5.1.2 |

### Already in good shape

18+ enforced server-side (`MIN_SIGN_UP_AGE` in shared Zod schema) · BeGambleAware
footer + "we're not a bookmaker" disclosure in-app · `ITSAppUsesNonExemptEncryption`
declared · iPhone-only · no third-party login (Sign in with Apple **not** required —
becomes mandatory if Google/Facebook login is ever added) · no
camera/location/photos permissions · brand assets current.

---

## Fix plan

### Phase 1 — code (blockers first)

1. **Account deletion** (finding 1)
   - API: `DELETE /api/user` — verifies password, then **anonymises** personal data
     (name → "Former member", unique tombstone email, password hash cleared, DOB
     nulled, push tokens + notification prefs deleted, sessions invalidated) while
     preserving group/leg/chat integrity for other members.
   - Sole-owned groups: transfer ownership to longest-standing member; delete the
     group if the leaver is its only member.
   - Mobile: "Delete account" flow in Account → confirmation with password.
   - Web: same action on `/account` for parity.
2. **Chat report + block** (finding 2)
   - Schema: `MessageReport` (message, reporter, optional reason) and `UserBlock`
     (blocker, blocked).
   - API: `POST /api/messages/[id]/report`; `POST/DELETE /api/users/[id]/block`;
     messages list excludes authors the requester has blocked.
   - Mobile: long-press a message → Report message / Block member. Confirmation
     alerts; blocked users' messages disappear immediately.
   - Reports surface in the admin settlement/overview area (v1: table + email alert).
3. **Push prompt gating** (finding 5): launch-time registration only refreshes the
   token when permission is already granted; never triggers the system prompt.
4. **Terms + support** (finding 6): `/terms` page on web; Legal card in the app links
   Terms and a support email; same links on web account page.

### Phase 2 — store setup (no code)

5. Age rating **18+** in App Store Connect (answer gambling questions truthfully).
6. **Availability: United Kingdom only** for v1.
7. **Privacy labels** per finding 7; Support URL + Marketing URL; privacy policy URL.
8. **Demo/reviewer account**: seeded group with locked acca, settled round, chat
   history; verify from a US IP (VPN) that fixtures/odds render and betslip links
   fail gracefully at worst.
9. **Review notes** (draft below).

### Review notes draft

> Tiki Acca is a social score-keeping app for groups of friends who follow football.
> It is not a bookmaker: no bets, wagers, or payments are accepted or processed in
> the app, and it contains no in-app purchases. The app shows live odds and lets a
> group track a shared accumulator; links to place actual bets open the websites of
> UK-licensed bookmakers externally (Safari). Availability is restricted to the
> United Kingdom; sign-up enforces 18+ (server-side date-of-birth validation);
> responsible-gambling guidance (BeGambleAware) is shown in-app. Group chat is
> limited to private friend groups and includes a profanity filter, message
> reporting, user blocking, and moderation by the developer.
> Demo account: [email] / [password] — already a member of a group with an active
> and a settled accumulator.

---

## Status

- [x] 1. Account deletion (API + mobile + web) — password-gated, anonymising; verified end-to-end
- [x] 2. Chat report + block (schema + API + mobile long-press, Account unblock list) — verified end-to-end
- [x] 3. Push prompt gating (silent token refresh at launch; prompt only from Account)
- [x] 4. Terms page (/terms) + support contact (in-app + footer)
- [ ] 5–9. Store setup (owner: Daniel, at submission time)

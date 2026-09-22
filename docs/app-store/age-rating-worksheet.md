# Age rating questionnaire — answers

App Store Connect → Age Rating. Questionnaire answers, no upload. The exact
wording shifts between ASC revisions; the anchors below map to any variant.

| Topic | Answer | Why |
|---|---|---|
| Simulated gambling | **None** | The app contains no casino-style simulated gambling games |
| Real gambling / wagering with real currency | **Yes — facilitates access** (select the option acknowledging gambling content/links) | Live odds + links out to real bookmakers. This is the honest answer and it is what forces the 18+ rating — do not answer around it |
| Contests | None | Points/leaderboards have no monetary value or prizes |
| Unrestricted web access | **No** | Links open specific bookmaker/support pages in the external browser, not an in-app open browser |
| Violence, horror, mature themes, sexual content, profanity | None / Infrequent-Mild at most | Chat has a profanity filter; UGC is declared separately, not here |
| User-generated content / social features | **Yes** where asked (frequent user interaction, private groups) | Group chat — moderation controls are in place |
| In-App Controls → **Parental Controls** | **None** | The app has no parental control features |
| In-App Controls → **Age Assurance** | **None** | The 18+ gate is a *self-declared* date of birth validated server-side, not identity verification or age estimation. Apple rejected 1.0 (5) under 2.3.6 for selecting this without finding a mechanism they recognised — see [review-reply-2.3.6-age-assurance.md](./review-reply-2.3.6-age-assurance.md). Selecting None does **not** lower the rating: 18+ comes from the gambling answers above |

**Expected resulting rating: 18+.** If the questionnaire lands on anything
lower after answering the gambling question truthfully, re-check the answers —
an 18+ rating is required for this category and reviewers check for
undershooting.

Also set in App Store Connect:
- **Availability:** United Kingdom only (Pricing and Availability page).
- **Made for Kids:** No.

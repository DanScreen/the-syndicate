# Reply pack — Guideline 2.3.6 (Age Rating: In-App Controls / Age Assurance)

**Rejection received:** 21 September 2026, submission
`34337c04-ce77-4982-bb9c-dd3a3e7a5879`, version 1.0 (5).

> The content description selected for the app's Age Rating indicates that the
> app includes In-App Controls. However, we were unable to find either Parental
> Controls or Age Assurance mechanisms in the app. […] Otherwise, update the Age
> Rating selections to "None" for "Age Assurance."

## Why the reviewer couldn't find it

App Review signs in with the demo account from
[review-notes.txt](./review-notes.txt). Before this change the **only** age
check in the app lived on the sign-up form, which a reviewer who signs in never
sees — and even there the date picker was capped at "18 years ago", so the 18+
rule could never be triggered or observed. Nothing in the signed-in app
mentioned age at all.

## What changed in the app (next build)

- **Account → Age verification** card (mobile and web): shows `18+ verified`,
  the date of birth held for the account, and how the check is enforced. This is
  reachable while signed in with the demo account, which is what the reviewer
  was looking for.
- Accounts with no date of birth on file (created before DOB capture) get an
  in-app **"Confirm I am 18 or over"** control in that same card, validated
  server-side by `PATCH /api/user/date-of-birth`. An under-18 date is rejected.
- **Sign-up** now labels the field "Date of birth — 18+ only", explains the
  rule, and *allows* an under-18 date to be entered so the gate visibly blocks
  it with "You must be 18 or over to use Tiki Acca." Same rule server-side.

## Ship order

`GET/PATCH /api/user/date-of-birth` is a **new web API route**: deploy the web
app (merge to `main` → `deploy.yml`) *before* submitting the mobile build, or the
Age verification card falls back to "Couldn't load your age verification
status". EAS assigns the build number remotely (`autoIncrement`), so the next
production build is 6 — no version file to bump.

## Decision: which reply to send

The mechanism is **self-declared date of birth, validated server-side** — not
identity verification or age estimation. Apple's "Age Assurance" content
description is not clearly defined for self-declaration, and arguing the point
costs a review cycle per round.

**Recommended: send Reply B** (set the selection to "None"). It resolves 2.3.6
with certainty in one round, and it costs nothing: the 18+ age rating comes from
the gambling answers in [age-rating-worksheet.md](./age-rating-worksheet.md),
not from the In-App Controls selection, and the 18+ gate stays in the app
either way.

Send **Reply A** instead only if the In-App Controls declaration is wanted for
its own sake and another review round is acceptable.

---

## Reply A — assert the mechanism (keeps the "Age Assurance" selection)

> Thank you for the review.
>
> The app does include an age assurance mechanism, and we have made it
> findable while signed in — the previous build only exposed it during
> registration, which a reviewer using our demo account would not see. The
> updated build is now submitted.
>
> Where to find it, signed in with the demo account:
>
> 1. Tap **Account** in the bottom tab bar.
> 2. The second card is **Age verification**. It shows an "18+ verified" badge
>    and the date of birth held for the account.
> 3. On an account with no date of birth on file, the same card shows a
>    "Confirm I am 18 or over" control; entering a date under 18 is rejected
>    with "You must be 18 or over to use Tiki Acca."
>
> To see the gate enforced end to end: sign out, tap **Create account**, and
> select a date of birth under 18. The sign-up is blocked with the same
> message. The rule is also enforced server-side on the registration request,
> so it cannot be bypassed by the client.
>
> Tiki Acca is an 18+ app. It takes no bets, holds no funds, and has no in-app
> purchases; bookmaker links open externally to UK-licensed operators.
>
> Please let us know if you would prefer us to select "None" for Age
> Assurance instead, and we will update the Age Rating immediately.

## Reply B — update the metadata (recommended)

> Thank you for the review.
>
> We have updated the Age Rating on the App Information page and selected
> **"None" for Age Assurance**, so the content description now matches the app.
> The app's age rating remains 18+.
>
> For context: the app does enforce a minimum age of 18 at registration by
> collecting a date of birth and validating it server-side, and the next build
> also surfaces that status in **Account → Age verification**. We are not claiming
> this as an Age Assurance mechanism, as it is a self-declared date of birth
> rather than identity verification or age estimation.
>
> No other metadata has changed. Please let us know if anything else is needed.

---

## App Store Connect steps for Reply B

1. App Store Connect → **Tiki Acca** → **App Information**.
2. **Age Rating** → Edit → the **In-App Controls** section.
3. Set **Age Assurance** to **None**. Leave **Parental Controls** at None.
4. Confirm the resulting rating is still **18+** (it comes from the gambling
   answers). If it drops, re-check those answers against
   [age-rating-worksheet.md](./age-rating-worksheet.md).
5. Save, then send Reply B in Resolution Center.

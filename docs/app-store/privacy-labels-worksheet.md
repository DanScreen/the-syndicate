# App Privacy questionnaire — answers

App Store Connect → App Privacy. No document upload; these are the answers to
select. Basis: first-party auth + analytics only, no ad SDKs, no third-party
tracking. **Answer "No" to "Do you or your third-party partners use data for
tracking?"** — nothing here meets Apple's tracking definition.

## Data types collected

| Apple category | What it is here | Linked to identity? | Used for tracking? | Purposes |
|---|---|---|---|---|
| Contact Info → Email Address | Sign-in email; notification emails | Yes | No | App Functionality |
| Contact Info → Name | First/last name shown to group members | Yes | No | App Functionality |
| User Content → Other User Content | Group chat messages; picks | Yes | No | App Functionality |
| Identifiers → User ID | Account ID; push device tokens | Yes | No | App Functionality |
| Usage Data → Product Interaction | First-party analytics events (page views, feature usage) | Yes | No | Analytics, App Functionality |
| Other Data → Other Data Types | Date of birth (18+ age verification only) | Yes | No | App Functionality |

## Not collected (leave unticked)

Location · Contacts · Health & Fitness · Financial Info · Browsing History ·
Search History · Purchases · Photos/Videos · Audio · Diagnostics (no crash
SDK is integrated — if Sentry/Crashlytics is ever added, add Diagnostics) ·
Advertising Data.

## Notes

- "Linked to identity" is Yes across the board because everything hangs off
  the account.
- Push tokens count under Identifiers; they're deleted on account deletion.
- If a scheme like Expo/EAS Insights or any crash reporter is enabled later,
  revisit this sheet before the next submission.
- Keep the answers consistent with https://www.tikiacca.com/privacy — App
  Review does cross-read them.

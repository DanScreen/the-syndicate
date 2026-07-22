# App Store & Play Store listing copy

Source of truth for marketing voice: [docs/BRAND.md](../../docs/BRAND.md), [apps/web/src/lib/marketing-content.ts](../web/src/lib/marketing-content.ts).

**We are not a bookmaker.** All listings must state users place bets with licensed operators.

---

## App name

**Tiki Acca**

## Subtitle (iOS, 30 chars max)

Social group football accas

## Short description (Play Store, 80 chars)

Pick legs with your mates, lock the acca, compare bookmakers, track performance.

## Full description (both stores)

Your mates. One acca. Every leg counts.

Tiki Acca is where football groups build shared accumulators together. Everyone picks one leg, you lock in the best odds, open bookmaker betslips, and keep score of who consistently delivers, and who lets the acca down.

**Built for friend groups** — Create a private group, share an invite code, and everyone contributes one selection per round.

**Track who's actually good** — Group and cross-group stats, leaderboards, and round history.

**Best odds, done for you** — Live UK bookmaker prices per leg; ranked combined accas when your group locks.

**You place the bets** — We coordinate picks and link you to licensed bookmaker betslips. We never take money or place bets on your behalf.

18+. Gamble responsibly. BeGambleAware.org

## Keywords (iOS, comma-separated)

football,acca,accumulator,tiki acca,betting,odds,bookmaker,friends,leaderboard,premier league

## Category

- **iOS:** Sports  
- **Play:** Sports

## Privacy policy URL

https://www.tikiacca.com/about

## Support URL

https://www.tikiacca.com/about

## Screenshots (required before submission)

Capture from production API on a real device:

1. Dashboard / groups list  
2. Leg picker (competition + fixture)  
3. Locked acca with bookmaker compare  
4. Group leaderboard  
5. Performance stats  

Use the Floodlight blue (#38bdf8) dark UI. No API credit counts in screenshots.

## Icons & splash

Export from Acca stack mark ([docs/BRAND.md](../../docs/BRAND.md#cross-platform-brand)):

| Asset | Path |
|-------|------|
| App icon | `assets/icon.png` (1024×1024) |
| Splash | `assets/splash-icon.png` on `#0b1220` background |
| Android adaptive | `assets/android-icon-foreground.png`, `android-icon-background.png` |

Re-export icons after any logo change on web.

## Age rating

17+ / PEGI — references gambling odds and bookmaker links (no in-app wagering).

## EAS build & submit

See [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md#mobile-apps-ios-and-android) and [README.md](./README.md).

---

# App Store Connect submission — paste-ready

Everything below is ready to copy straight into the App Store Connect form.

## App Review Information → Notes

```
What Tiki Acca is
Tiki Acca is a social app for friend groups to build football accumulators
("accas") together. Each member picks one selection ("leg"); the app combines
them, shows live odds from licensed UK bookmakers, and tracks a points-based
leaderboard of who picks best over time.

We are NOT a gambling operator / bookmaker.
- The app does not accept bets, hold funds, process payments, or settle wagers.
- No real-money gambling or wagering takes place in the app.
- When a group locks its acca, we display bookmaker odds and provide outbound
  links to licensed UK bookmakers' own betslips. Any actual bet is placed by the
  user, on the bookmaker's own platform, under that bookmaker's license.
- Performance is scored in points (pick skill), not money.

Compliance
- 18+ throughout, with responsible-gambling messaging (BeGambleAware) and a
  "Not a bookmaker" disclosure.
- Availability is limited to the United Kingdom, where linking to licensed
  operators is permitted.

Reviewer sign-in
The app requires an account. Please use this demo login, which shows a fully
populated group:
  Email: danny@demo.tikiacca.com
  Password: DemoPass123!
After signing in, open the group "The Thursday Club" to see picks, live
odds/bookmaker comparison, the leaderboard, group chat, and performance stats.

Contact for any questions: tikiacca@outlook.com
```

**Contact block** (fields above Notes): use your real name, phone, and `tikiacca@outlook.com`.

## Description (plain text — no Markdown; paste as-is)

```
Your mates. One acca. Every leg counts.

Tiki Acca is where football groups build shared accumulators together. Everyone picks one leg, you lock in the best odds, open bookmaker betslips, and keep score of who consistently delivers, and who lets the acca down.

Built for friend groups — Create a private group, share an invite code, and everyone contributes one selection per round.

Track who's actually good — Group and cross-group stats, leaderboards, and round history.

Best odds, done for you — Live UK bookmaker prices per leg; ranked combined accas when your group locks.

You place the bets — We coordinate picks and link you to licensed bookmaker betslips. We never take money or place bets on your behalf.

18+. Gamble responsibly. BeGambleAware.org
```

## Other fields

| Field | Value |
|-------|-------|
| Promotional Text | `Your mates. One acca. Everyone picks a leg, lock in the best odds, and track who actually delivers.` |
| Keywords | `football,acca,accumulator,tiki acca,betting,odds,bookmaker,friends,leaderboard,premier league` |
| Support URL | `https://www.tikiacca.com/about` |
| Marketing URL | `https://www.tikiacca.com` |
| Copyright | `© 2026 Daniel Screen` |
| Primary category | Sports |
| Secondary category | Social Networking |
| Age rating | 17+ (answer gambling/contest references honestly) |
| Price | Free |
| Availability | United Kingdom only (initial launch) |
| Version release | Manually release this version |
| Export compliance | No (ITSAppUsesNonExemptEncryption = false) |
| Build | 5 |

## App Privacy (data collection questionnaire)

- Contact Info — Name, Email — linked to identity — App Functionality
- Identifiers — User ID — linked to identity — App Functionality
- User Content — picks / messages — App Functionality
- Usage Data — Product Interaction — Analytics
- Tracking — **No** (no IDFA / third-party ad tracking) → "Data Not Used to Track You"

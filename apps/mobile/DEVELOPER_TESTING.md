# Developer testing (native app, no store fees)

Run the **real Expo app** on your iPhone or simulator before paying Apple Developer (~£99/yr). This is not “save the website to your home screen” — it is the `apps/mobile` codebase talking to the production API.

**Decision (July 2026):** Defer store accounts until friend groups validate the full loop. **You** test natively now; **mates** get Android APK or TestFlight later.

---

## Prerequisites

From repo root (once, or after pulling dependency changes):

```bash
npm install --legacy-peer-deps
```

Install **Expo Go** on your iPhone from the App Store (free).

For simulator or `expo run:ios --device`: Xcode from the Mac App Store.

---

## Option 1 — Expo Go on your iPhone (fastest, £0)

Best for day-to-day development: hot reload, no build step, no Apple Developer account.

1. iPhone and Mac on the **same Wi‑Fi**.
2. Point the app at production:

   ```bash
   cd apps/mobile
   cp .env.example .env
   # Edit .env:
   # EXPO_PUBLIC_API_URL=https://www.the-syndicate.uk
   ```

3. Start the dev server:

   ```bash
   npm run dev:prod
   ```

   Or with a local API instead: `npm run dev` (Simulator only — `localhost` does not work from a physical phone).

4. Scan the QR code with the **iPhone Camera** → opens in **Expo Go**.
5. Sign in and run through the full loop (group → leg → lock → settle).

| Pros | Cons |
|------|------|
| Instant reload | Runs inside Expo Go (not a standalone home-screen icon) |
| No Apple Developer | Deep links use Expo Go until you install a dev build |
| Same API + auth as release | |

---

## Option 2 — iOS Simulator on your Mac (£0)

```bash
cd apps/mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:3000  (with npm run dev in apps/web)
# or EXPO_PUBLIC_API_URL=https://www.the-syndicate.uk
npm run ios:prod   # prod API
# npm run ios      # uses .env
```

Good for UI and navigation; use Expo Go on a real device for gestures, keyboard, and performance.

---

## Option 3 — Standalone app on **your** iPhone (£0 Apple ID)

Install **The Syndicate** as its own app icon on your phone — no Expo Go shell, no paid developer program (personal Apple ID only; cert renews ~every 7 days).

```bash
cd apps/mobile
# .env with EXPO_PUBLIC_API_URL=https://www.the-syndicate.uk
npx expo run:ios --device
```

First run: Xcode may prompt you to sign in with your **Apple ID** (Settings → Accounts → add Personal Team). Select your iPhone as the run target.

| Pros | Cons |
|------|------|
| Real app icon + `the-syndicate://` deep links | First build is slow (CocoaPods, native compile) |
| No £99/year yet | Only **your** devices — cannot share IPA with friends without Apple Developer |
| Matches production binary closely | Re-sign weekly on free provisioning |

---

## Option 4 — Android (emulator or USB device, £0)

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://www.the-syndicate.uk npm run android
```

Or Expo Go: `npm run dev:prod` → scan QR on Android with Expo Go app.

---

## What to validate

Same checklist as [FRIEND_TESTING.md](./FRIEND_TESTING.md#what-to-validate) — use **production** (`https://www.the-syndicate.uk`) unless you are deliberately testing against local web.

---

## After you are happy (friends, still no iPhone store fee)

| Who | How |
|-----|-----|
| **You** | Options 1–3 above |
| **Android mates** | Preview APK — [FRIEND_TESTING.md](./FRIEND_TESTING.md#option-b--android-apk-native-0-store-fee) |
| **iPhone mates** | Apple Developer → TestFlight (post-validation) |

Web “Add to Home Screen” is a **last-resort fallback** for iPhone friends if you delay TestFlight — not the developer testing path.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| QR code won’t connect | Same Wi‑Fi; disable VPN; try `npx expo start --tunnel` |
| API errors on phone | `.env` must use `https://www.the-syndicate.uk`, not `localhost` |
| `expo run:ios --device` signing error | Xcode → Signing & Capabilities → Team = your Apple ID |
| Expo Go version mismatch | App targets **SDK 54** — update Expo Go from App Store; `npx expo install --fix` in `apps/mobile` |
| `Web Bundling failed` / `react-native-web` | Native app only — don’t press `w` in Expo CLI; scan QR with **Expo Go** or press `i` for Simulator |

---

## Related

- [README.md](./README.md) — scripts, EAS profiles  
- [FRIEND_TESTING.md](./FRIEND_TESTING.md) — distributing to mates (APK / later TestFlight)  
- [docs/specs/mobile-apps.md](../../docs/specs/mobile-apps.md#distribution-strategy)

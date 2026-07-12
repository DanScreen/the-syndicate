# The Syndicate — mobile app

Expo React Native app (`apps/mobile`). Strategy: [docs/specs/mobile-apps.md](../../docs/specs/mobile-apps.md).

## Developer testing (start here)

**Run the native app on your iPhone — no store fees:** [DEVELOPER_TESTING.md](./DEVELOPER_TESTING.md)

```bash
cd apps/mobile
npm run dev:prod    # scan QR with Expo Go on your iPhone
npm run ios:prod    # iOS Simulator against prod API
npx expo run:ios --device   # standalone app on your phone (free Apple ID)
```

Friend distribution (APK / later TestFlight): [FRIEND_TESTING.md](./FRIEND_TESTING.md)

---

## Prerequisites (store release — later)

- Node 20+
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
- Expo account: `eas login` (free)
- **Apple Developer Program** — only when ready for TestFlight / App Store
- **Google Play Console** — only when listing on Play Store (APK sideload skips this)

## First-time EAS setup

From repo root:

```bash
npm install
cd apps/mobile
eas init          # links project; writes projectId to app.json
```

Store `EXPO_TOKEN` in GitHub secrets for CI (expo.dev → Access tokens).

Optional — App Store Connect app ID for `eas submit` (after Apple Developer):

1. Create the app in App Store Connect (`com.thesyndicate.app`)
2. Replace `ascAppId` in `eas.json` → `submit.production.ios`

## Local development

```bash
cp .env.example .env    # EXPO_PUBLIC_API_URL=http://localhost:3000
npm run ios             # or npm run android
```

Physical device against prod API:

```bash
EXPO_PUBLIC_API_URL=https://www.the-syndicate.uk npm run ios
```

## Build profiles (`eas.json`)

| Profile | Use | API URL |
|---------|-----|---------|
| `development` | iOS Simulator build | Production |
| `preview` | Friend APK / TestFlight internal | Production |
| `production` | App Store / Play Store | Production |

```bash
# Friend testing (Android, no store fee)
eas build --profile preview --platform android

# After Apple Developer account
eas build --profile preview --platform ios

# Store release (after validation + paid accounts)
eas build --profile production --platform all
```

Or use npm scripts: `npm run build:preview:android`, etc.

## Submit to stores (after validation)

```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

## Deep links (testing)

```bash
xcrun simctl openurl booted "the-syndicate://groups/join?code=YOURCODE"
```

## Store listing copy

[STORE_LISTING.md](./STORE_LISTING.md) — use when submitting to stores.

## CI

`.github/workflows/eas.yml` — manual dispatch or `mobile-v*` tags. Requires `EXPO_TOKEN` secret.

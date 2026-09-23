# Tiki Acca — mobile app

Expo React Native app (`apps/mobile`). Strategy: [docs/specs/mobile-apps.md](../../docs/specs/mobile-apps.md).

**Store status:** iOS live in App Store Connect (build 5). Android built with Firebase
push wired up, submission blocked on Play Console ID verification — see
[ANDROID_LAUNCH.md](./ANDROID_LAUNCH.md) for the full progress/checklist.

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

## EAS project

Linked to [`@the-syndicate/tiki-acca`](https://expo.dev/accounts/the-syndicate/projects/tiki-acca). The project ID is committed as the fallback in `app.config.ts`; local `EAS_PROJECT_ID` can override it.

From repo root:

```bash
npm install
cd apps/mobile
eas whoami
eas project:info
```

Store `EXPO_TOKEN` in GitHub secrets for CI (expo.dev → Access tokens).

Optional — App Store Connect app ID for `eas submit` (after Apple Developer):

1. Create the app in App Store Connect (`com.tikiacca.app`)
2. Replace `ascAppId` in `eas.json` → `submit.production.ios`

## Local development

```bash
cp .env.example .env    # EXPO_PUBLIC_API_URL=http://localhost:3000
npm run ios             # or npm run android
```

Physical device against prod API:

```bash
EXPO_PUBLIC_API_URL=https://www.tikiacca.com npm run ios
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

Submitting does not auto-release: iOS lands in App Store Connect (still needs manual "submit for review"), Android lands as a **draft** on the internal track (`eas.json` → `submit.production.android.releaseStatus`) and needs manual promotion in Play Console.

## Versioning

Three numbers look like versions here — only two matter for the stores:

| Where | Example | What it is |
|-------|---------|------------|
| `app.json` → `expo.version` | `1.0.0` | The marketing version shown in the App Store / Play Store. Bump this by hand for a user-visible release (e.g. `1.0.0` → `1.1.0`). |
| iOS build number / Android version code | build `5` | Not stored in the repo — `eas.json` sets `"appVersionSource": "remote"`, so EAS tracks it on expo.dev, and `"autoIncrement": true` on the `production` profile bumps it automatically on every production build. Find it with `eas build:list --profile production --limit 5`. |
| `package.json` → `version` | `1.0.0` | Cosmetic only (this package is `private` and never published). Kept in sync with `app.json` by convention so it doesn't mislead — not read by EAS or the stores. |

So "we pushed 0.0.5" usually means "build 5 of marketing version 1.0.0" — check `eas build:list` rather than trusting a number from memory.

**When you bump `app.json`'s `version`:** you don't need to touch anything else. The native `ios/` and `android/` projects are not committed — `expo prebuild` generates them from `app.json` / `app.config.ts` (EAS does this on every build; `npm run ios` / `npm run android` do it locally), so `runtimeVersion.policy: "appVersion"` is always re-applied and OTA updates (below) stay matched to the new version. Change native settings in `app.json` or a config plugin, never in a generated `ios/` or `android/` folder.

## Tagging releases

Every production build/submit should get a git tag so `git log` can answer "what commit is live as build N" without cross-referencing expo.dev:

```bash
npm run tag:release -- ios          # or: npm run tag:release -- android
git push origin mobile-ios-v1.0.0-b5   # review the tag it prints, then push it
```

This reads the latest finished `production` build from EAS (`scripts/tag-release.js`) and tags *that build's commit* (not necessarily your current `HEAD`) as `mobile-<platform>-v<version>-b<buildNumber>`. It only creates the tag locally — pushing is a separate, explicit step since tags are shared/visible to anyone with repo access.

## OTA updates (`expo-updates`)

JS-only changes (no new native dependencies, no native config changes) can ship without an App Store/Play review via `eas update`. Each build profile maps to an update channel (`eas.json` → `build.<profile>.channel`):

```bash
npm run update:preview -- --message "Fix leaderboard sort"
npm run update:production -- --message "Fix crash on group invite"
```

Rules of thumb:
- An OTA update only reaches installs whose **runtime version** matches — i.e. installs built from the same `app.json` `version` (see above). A native rebuild is still required whenever you change native code/config (new native module, `Info.plist`/`AndroidManifest` changes, SDK upgrade) — `eas update` can't ship those.
- Test on `preview` first (`npm run update:preview`) before pushing to `production`.
- Tag OTA releases too if they matter for the release history, e.g. `git tag ota-production-2026-07-26 && git push origin ota-production-2026-07-26`.

## Deep links (testing)

```bash
xcrun simctl openurl booted "tikiacca://groups/join?code=YOURCODE"
```

## Store listing copy

[STORE_LISTING.md](./STORE_LISTING.md) — use when submitting to stores.

## CI

`.github/workflows/eas.yml` releases on a **version bump**: when a push to `main` changes `expo.version` in `app.json` (e.g. `1.0.0` → `1.1.0`), it starts a `production` EAS build with `--auto-submit`, so the binary goes to App Store Connect (TestFlight) / the Play `internal` track as soon as it finishes. Pushes that don't change the version don't build — ship those as OTA updates (above). The workflow uses `--no-wait`, so the GitHub job finishes once the build is queued; follow it on expo.dev.

- **Platforms:** repo variable `MOBILE_RELEASE_PLATFORMS` (`ios`, `android` or `all`; default `ios`). Set it to `all` once Play submission works ([ANDROID_LAUNCH.md](./ANDROID_LAUNCH.md) step 4).
- **Manual builds:** Actions → *EAS Build (mobile)* → Run workflow — pick platform/profile, and tick *submit* to auto-submit a `production` build.
- **Requires:** `EXPO_TOKEN` GitHub secret, plus store credentials saved on EAS so `eas submit` can run non-interactively — an App Store Connect API key (iOS) and a Google service account key (Android).
- Still tag the release afterwards (`npm run tag:release`, above).

### Releasing a new store version

1. On a branch, bump `expo.version` in `app.json` (and `version` in `package.json` to match — cosmetic). Use a new marketing version only for changes that need a native rebuild or a store listing; JS-only fixes go out as OTA updates instead.
2. Open a PR and merge it to `main`. The merge starts *EAS Build (mobile)* in GitHub Actions; its log prints `Version bumped X -> Y` and the expo.dev build link. (A merge that touches `app.json` without changing the version logs `expo.version unchanged` and builds nothing.)
3. Wait for the build and submission on expo.dev (~20–30 min). iOS arrives in App Store Connect / TestFlight; Android (once enabled) lands as a draft on the internal track.
4. Release it by hand: App Store Connect → *Add for review* → submit; Play Console → promote the draft. Nothing reaches users automatically.
5. Tag the commit: `npm run tag:release -- ios` (and `-- android`), then push the tag it prints.

After the bump, OTA updates published from `main` (`npm run update:production`) carry the new version's runtime, so they reach only installs of the new build. Users still on the old version get no further OTA updates until they update from the store — see [OTA updates](#ota-updates-expo-updates).

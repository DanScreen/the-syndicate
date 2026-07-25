# Android launch — Tiki Acca

The mobile app is a single Expo / React Native codebase that builds to **both**
iOS and Android from the same source. There is **no separate Android app** — Android
is just the other build target. This doc covers un-pausing Android: building the
binary, wiring push, and submitting to Google Play.

## What's already done (in the repo)

- `app.json` → `android.package` = `com.tikiacca.app`, full adaptive icon
  (foreground/background/monochrome), App Links intent filter with `autoVerify`.
- `eas.json` → `build.production` and `submit.production.android` (Play `internal`
  track, `draft` status) profiles.
- `app.config.ts` → attaches `google-services.json` **only if present**, so the
  build works before Firebase exists and gains FCM push the moment you add it.
- `apps/web/public/.well-known/assetlinks.json` → Android App Links verification
  file, served by the web app (needs the signing fingerprint filled in — step 2).
- Shared UI: no `Platform.OS === "android"` forks, no `.android.tsx` files.

## Prerequisites (one-time)

- An Expo account and `npx eas login` (the EAS project id is already in `app.config.ts`).
- A Google Play Console developer account (**$25 one-time**) — https://play.google.com/console
- For push: a Firebase project — https://console.firebase.google.com

---

## Step 1 — Build the Android app bundle

```bash
cd apps/mobile
npm run build:production:android      # eas build --profile production --platform android
```

First run, EAS offers to **generate an Android upload keystore** — accept; EAS stores
and manages it. Output is an `.aab` you can download. `versionCode` auto-increments
(remote in `eas.json`), so you don't manage it by hand.

To sanity-check on a device before Play, build a preview APK instead:

```bash
npm run build:preview:android
```

## Step 2 — Fill in the App Links fingerprint

App Links (tapping a `www.tikiacca.com/groups/...` link opens the app) verify against
`https://www.tikiacca.com/.well-known/assetlinks.json`. Get the signing cert's SHA-256:

```bash
cd apps/mobile
npx eas credentials --platform android      # → Production keystore → shows SHA-256
```

Copy the SHA-256 into `apps/web/public/.well-known/assetlinks.json`
(replace `REPLACE_WITH_SHA256_FROM_EAS_CREDENTIALS`), then deploy the web app.
Verify: `curl https://www.tikiacca.com/.well-known/assetlinks.json` returns it, no redirect.

> If Google Play App Signing is enabled (default on submit), Play re-signs with its
> own key — add **both** the upload and Play App Signing SHA-256 fingerprints
> (the Play one appears in Play Console → your app → Setup → App integrity).

## Step 3 — Android push notifications (FCM)

Android delivers `expo-notifications` via Firebase Cloud Messaging.

1. In the Firebase console, create/open a project, add an **Android app** with package
   `com.tikiacca.app`, and download **`google-services.json`**.
2. Put it at `apps/mobile/google-services.json` and **commit it** (it is client config,
   not a secret; EAS only bundles committed files). `app.config.ts` picks it up
   automatically.
3. Give EAS the **FCM v1 service account key** so the push service can send:
   ```bash
   npx eas credentials --platform android    # → Push Notifications → upload the FCM v1 key JSON
   ```
   (Get the key from Firebase → Project settings → Service accounts → Generate new
   private key.)
4. Rebuild (step 1) so `google-services.json` is baked in.

Until this is done, the Android build still works — only push is inactive.

## Step 4 — Submit to Google Play

1. In Play Console, create the app (package `com.tikiacca.app`) and complete the
   required listing/content forms once.
2. Create a **service account** with Play access for automated submits:
   Play Console → Setup → API access → link a Google Cloud project → create a service
   account → grant it "Release to testing tracks" → download its JSON key.
3. Point EAS submit at it — either set `EXPO_APPLE...` n/a, or add to `eas.json`
   under `submit.production.android`:
   ```json
   "serviceAccountKeyPath": "./play-service-account.json"
   ```
   (keep that key file gitignored — it **is** a secret), then:
   ```bash
   npm run submit:android      # eas submit --platform android --profile production --latest
   ```
   It uploads the latest build to the **internal** track as a **draft** (per `eas.json`).
4. Promote from internal → closed/open testing → production in Play Console when ready.

---

## Quick reference

| Task | Command (from `apps/mobile`) |
|------|------------------------------|
| Production `.aab` | `npm run build:production:android` |
| Preview `.apk` (device test) | `npm run build:preview:android` |
| View signing SHA-256 / manage push creds | `npx eas credentials --platform android` |
| Submit latest build to Play | `npm run submit:android` |

## Note: iOS deep links have the same gap

`app.json` declares `associatedDomains: applinks:www.tikiacca.com` for iOS, but the web
app does **not** yet serve `/.well-known/apple-app-site-association`. iOS Universal Links
won't verify until it does (the iOS counterpart to `assetlinks.json`). Out of scope for
the Android launch, but worth fixing alongside.

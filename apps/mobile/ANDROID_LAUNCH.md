# Android launch — Tiki Acca

The mobile app is a single Expo / React Native codebase that builds to **both**
iOS and Android from the same source. There is **no separate Android app** — Android
is just the other build target. This doc covers un-pausing Android: building the
binary, wiring push, and submitting to Google Play.

## Progress

| Step | Status |
|------|--------|
| 1 — Build the Android app bundle | **Done** (first build). First production build `versionCode 2` finished 2026-07-25. A rebuild, `versionCode 3`, was kicked off 2026-07-27 to bake in Firebase push and was still in EAS's queue as of this writing — check `eas build:list --platform android --limit 1` for current status before assuming it's ready. Uses EAS-managed keystore `Build Credentials 2rrA7GYzJI (Default)`. |
| 2 — App Links fingerprint | **Done.** Real SHA-256 from the production keystore is live in `apps/web/public/.well-known/assetlinks.json` (deployed). Still need the **Play App Signing** fingerprint too, once that's known (see step 2 below). |
| 3 — Push notifications (FCM) | **Done.** `apps/mobile/google-services.json` committed; FCM v1 service account key (`firebase-adminsdk-fbsvc@tiki-acca.iam.gserviceaccount.com`) uploaded and assigned to the project on EAS. |
| 4 — Submit to Google Play | **Blocked** on Google Play Console ID verification (in progress as of 2026-07-27, pending completion). Nothing else to do until that clears — then create the app, service account, and submit. |

Known non-blocking loose end: uploading/re-checking the FCM v1 key through `eas credentials`'s interactive menu (it has no non-interactive/scriptable mode) accidentally created **6 extra, unused Android keystores** in the EAS project alongside the real default one. They're inert — not referenced by any build, cost nothing — but can be pruned via `eas credentials --platform android` → `Keystore` → `Delete your keystore` if you want to tidy up.

Also note: GitHub's secret scanner flags the API key inside `google-services.json` as a "Google API Key" — this is a known false positive (see the note in step 3) and has been dismissed on the repo's Security tab.

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

## Step 1 — Build the Android app bundle ✅ done

```bash
cd apps/mobile
npm run build:production:android      # eas build --profile production --platform android
```

First run, EAS offered to **generate an Android upload keystore** — accepted; EAS stores
and manages it (`Build Credentials 2rrA7GYzJI`, marked `(Default)`). Output is an `.aab`.
`versionCode` auto-increments (remote in `eas.json`), so it isn't managed by hand —
currently at `3` after the rebuild in step 3.

To sanity-check on a device before Play, build a preview APK instead:

```bash
npm run build:preview:android
```

## Step 2 — Fill in the App Links fingerprint ✅ done (upload fingerprint)

App Links (tapping a `www.tikiacca.com/groups/...` link opens the app) verify against
`https://www.tikiacca.com/.well-known/assetlinks.json`. Get the signing cert's SHA-256:

```bash
cd apps/mobile
npx eas credentials --platform android      # → Production keystore → shows SHA-256
```

The SHA-256 from the upload keystore (`DD:64:4F:...:A4:11:F5`) is already in
`apps/web/public/.well-known/assetlinks.json`, deployed. Verify:
`curl https://www.tikiacca.com/.well-known/assetlinks.json` returns it, no redirect.

> If Google Play App Signing is enabled (default on submit), Play re-signs with its
> own key — add **both** the upload and Play App Signing SHA-256 fingerprints
> (the Play one appears in Play Console → your app → Setup → App integrity). **Still
> outstanding** — no Play app exists yet (step 4), so this second fingerprint can't be
> added until then.

## Step 3 — Android push notifications (FCM) ✅ done

Android delivers `expo-notifications` via Firebase Cloud Messaging.

1. In the Firebase console, create/open a project, add an **Android app** with package
   `com.tikiacca.app`, and download **`google-services.json`**. Done — Firebase project
   `tiki-acca`, package `com.tikiacca.app`.
2. Put it at `apps/mobile/google-services.json` and **commit it** (it is client config,
   not a secret; EAS only bundles committed files). `app.config.ts` picks it up
   automatically. Committed. Note: GitHub's secret scanner flags the embedded API key
   as a "Google API Key" — this is a **known false positive**, the key ships inside
   every compiled APK anyway and is restricted by package/SHA-1 on Google's side; the
   alert has been dismissed as such on the repo's Security → Secret scanning tab. Worth
   double-checking in Google Cloud Console → APIs & Services → Credentials that the key
   is restricted to this app and only the APIs actually in use, as belt-and-braces.
3. Give EAS the **FCM v1 service account key** so the push service can send:
   ```bash
   npx eas credentials --platform android    # → Google Service Account → Upload, then
                                              #   Manage ... FCM V1 → Select an existing key
   ```
   (Get the key from Firebase console → Project settings → Service accounts tab →
   "Generate new private key" — Firebase's UI doesn't say "FCM v1" anywhere, this
   "Firebase Admin SDK" key **is** the FCM v1 credential.) Done — key uploaded and
   assigned to `com.tikiacca.app` for FCM V1; the local downloaded copy was deleted
   after upload since it's a real secret (unlike `google-services.json`).
4. Rebuild (step 1) so `google-services.json` is baked in. Kicked off as `versionCode 3` (2026-07-27) — confirm it finished with `eas build:list --platform android --limit 1` before relying on it.

## Step 4 — Submit to Google Play ⏳ blocked on ID verification

1. In Play Console, create the app (package `com.tikiacca.app`) and complete the
   required listing/content forms once. **In progress** — Play Console requires identity
   verification before an app can be created; verification was submitted and is pending
   (started 2026-07-27, expected to clear the next day). Nothing else in this step is
   possible until it does.
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
5. Once the app exists, go back to step 2 above and add the Play App Signing SHA-256
   fingerprint to `assetlinks.json` alongside the upload one.

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

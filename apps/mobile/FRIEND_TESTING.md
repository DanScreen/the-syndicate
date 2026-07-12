# Friend testing (no store fees)

Get the native app to **mates' phones** before paying Apple (~£99/yr) or Google Play (~£25).

**You (developer)** should test the real app first — see **[DEVELOPER_TESTING.md](./DEVELOPER_TESTING.md)** (Expo Go, Simulator, or `expo run:ios --device`). This doc is for **sharing with friends** after you are happy.

**Decision (July 2026):** Defer store developer accounts until real friend groups complete the full acca loop. [docs/specs/mobile-apps.md](../../docs/specs/mobile-apps.md#distribution-strategy)

---

## What to validate

Run 2–3 groups through the success metric ([docs/ROADMAP.md](../../docs/ROADMAP.md)):

1. Sign up  
2. Create / join group  
3. Submit leg (competition + market tiers)  
4. Acca locks  
5. Open betslip / compare bookmakers  
6. Leg results update  
7. Settle → leaderboard / stats  

Use **production API:** `https://www.the-syndicate.uk`

---

## Option A — Android APK (native, £0 store fee) **Recommended for mates**

For Android friends who want the real app without Play Store:

### One-time (you)

```bash
npm install -g eas-cli
eas login                    # free Expo account
cd apps/mobile
eas init                     # links project once
eas build --profile preview --platform android
```

Expo **free tier** includes limited cloud builds/month — enough for friend testing.  
When the build finishes, download the `.apk` from the Expo dashboard.

### Share with mates

1. Upload APK to Google Drive / Dropbox / GitHub Release (private link is fine).  
2. They download and open the file.  
3. Android may ask to allow **Install unknown apps** for that source (one-time).  
4. App talks to prod API (`eas.json` preview profile).

---

## Option B — iPhone mates (after you pay Apple Developer)

Cannot install a shareable native IPA on friends' iPhones without Apple Developer (~£99/yr) → TestFlight.

Until then, iPhone mates use the **website** (Option C) or wait for TestFlight.

After validation:

```bash
eas build --profile preview --platform ios
# TestFlight via App Store Connect
```

---

## Option C — Website fallback (iPhone mates only, £0)

If you need iPhone friends in the loop **before** TestFlight:

Everyone visits **https://www.the-syndicate.uk** in Safari → Share → **Add to Home Screen**.

```
https://www.the-syndicate.uk/groups/join?code=INVITECODE
```

This is the **web product**, not the native app — use only when APK/TestFlight is not an option.

---

## What we are **not** doing yet

| Item | Cost | When |
|------|------|------|
| Apple Developer Program | ~£99/yr | After friend validation → TestFlight for iPhone mates |
| Google Play Console | ~£25 once | When you want Play Store listing (APK sideload works without it) |
| `eas submit` to stores | — | After accounts exist |

EAS **Submit** and `STORE_LISTING.md` are ready when you are.

---

## Suggested rollout

1. **You:** Native dev testing — [DEVELOPER_TESTING.md](./DEVELOPER_TESTING.md).  
2. **Week 1:** You + 1–2 friends — Android APK or web fallback on iPhone. One full acca cycle.  
3. **Week 2:** More Android mates on preview APK if needed.  
4. **After 2–3 successful groups:** Apple Developer → TestFlight for iPhone mates.  
5. **Later:** Play Store / App Store public listing if you want growth beyond friend groups.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't sign in on phone | Prod builds use `https://www.the-syndicate.uk` via `eas.json` / `.env` |
| Invite link doesn't pre-fill code | Web: `/groups/join?code=`; native APK: `the-syndicate://groups/join?code=` |
| APK won't install | Enable unknown sources; ARM64 device |
| iPhone mates want native app | TestFlight after Apple Developer — or web fallback temporarily |

---

## Related

- [DEVELOPER_TESTING.md](./DEVELOPER_TESTING.md) — **your** native testing (Expo Go, device build)  
- [README.md](./README.md) — EAS profiles, store release (later)  
- [STORE_LISTING.md](./STORE_LISTING.md) — when you submit to stores  
- [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md#friend-testing-without-store-fees)

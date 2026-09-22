# Profile pictures for the video ad

Drop one square headshot per cast member here, named by the member `key` in
`../scenario.json`: `rob`, `jay`, `nadia`, `kev`, `tom`, `aisha`, `callum`,
`femi` (`.png`, `.jpg`, `.jpeg` or `.webp`). Use the AI character-bible
headshots so the faces on the phone match the players on the pitch.

`npm run video-ad:capture` crops each to a circle beside the member's name on
every leg, settled card and leaderboard row. Anyone without a file gets a
placeholder in their team colour with their initials.

Every face must read unambiguously 25+ (CAP 16.3.14) — the same rule as the
footage. The app has no profile pictures today; see the compliance notes in
`docs/VIDEO_AD_BRIEF.md` §9 before these frames are used in a live ad.
